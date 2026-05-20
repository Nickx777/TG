import express from "express";
import path from "path";
import { Readable } from "stream";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // 1. Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // 2. Proxy Telegram File Download & Preview (Bypass Telegram CORS limits)
  app.get("/api/telegram/download", async (req, res) => {
    const { token, file_id, action, filename } = req.query;

    if (!token || !file_id) {
      return res.status(400).json({ error: "Missing bot token or file_id" });
    }

    try {
      // Fetch file path details from Telegram Bot API
      const getFileUrl = `https://api.telegram.org/bot${token}/getFile?file_id=${file_id}`;
      const pathResponse = await fetch(getFileUrl);
      if (!pathResponse.ok) {
        const errText = await pathResponse.text();
        return res.status(pathResponse.status).json({ error: `Telegram getFile failed: ${errText}` });
      }

      const pathData = (await pathResponse.json()) as any;
      if (!pathData.ok || !pathData.result?.file_path) {
        return res.status(500).json({ error: "Failed to locate files inside Telegram servers" });
      }

      const filePath = pathData.result.file_path;
      const downloadUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

      // Fetch the binary file from Telegram CDN
      const fileResponse = await fetch(downloadUrl);
      if (!fileResponse.ok) {
        return res.status(fileResponse.status).json({ error: `Telegram CDN file fetch failed: ${fileResponse.statusText}` });
      }

      const contentType = fileResponse.headers.get("content-type") || "application/octet-stream";
      const contentLength = fileResponse.headers.get("content-length");

      // Configure safe streaming headers
      res.setHeader("Content-Type", contentType);
      if (contentLength) {
        res.setHeader("Content-Length", contentLength);
      }

      // Configure CORS
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type");

      const cleanFilename = encodeURIComponent((filename as string) || "file");
      if (action === "download") {
        res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${cleanFilename}`);
      } else {
        res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${cleanFilename}`);
      }

      // Stream chunks of the response securely from Telegram to the client
      if (fileResponse.body) {
        const nodeStream = Readable.fromWeb(fileResponse.body as any);
        nodeStream.pipe(res);
      } else {
        res.status(500).json({ error: "No stream body found in Telegram response" });
      }
    } catch (err: any) {
      console.error("Express Telegram download proxy error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || "Failed to stream requested file" });
      }
    }
  });

  // 3. Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Telegram Drive Express Server listening on port ${PORT}`);
  });
}

startServer();
