/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DriveFile, DriveFolder } from "../types";

/**
 * Validates a Telegram Bot Token by calling getMe.
 * Returns bot info if successful, otherwise throws an error.
 */
export async function validateBotToken(token: string): Promise<{ name: string; username: string }> {
  const cleanToken = token.trim();
  const url = `https://api.telegram.org/bot${cleanToken}/getMe`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Invalid Token: Received status ${res.status}`);
    }
    const data = await res.json();
    if (data.ok && data.result) {
      return {
        name: data.result.first_name,
        username: data.result.username,
      };
    } else {
      throw new Error(data.description || "Invalid bot token");
    }
  } catch (err: any) {
    throw new Error(err.message || "Failed to communicate with Telegram API");
  }
}

/**
 * Tries to auto-discover Chat ID from updates.
 * Listens for the last text message or star written to the Bot.
 */
export async function discoverChatId(token: string): Promise<{ chatId: string; senderName: string } | null> {
  const url = `https://api.telegram.org/bot${token.trim()}/getUpdates?limit=5&offset=-1`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
      // Get the latest update
      const latest = data.result[data.result.length - 1];
      const message = latest.message || latest.channel_post || latest.edited_message;
      if (message && message.chat) {
        const id = String(message.chat.id);
        const name = message.chat.title || message.chat.first_name || "Unknown Chat";
        return { chatId: id, senderName: name };
      }
    }
    return null;
  } catch (err) {
    console.error("Failed to discover chat ID:", err);
    return null;
  }
}

/**
 * Sends a message to the bot to verify the connection.
 */
export async function sendVerificationMessage(token: string, chatId: string, botName: string): Promise<boolean> {
  const url = `https://api.telegram.org/bot${token.trim()}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId.trim(),
        text: `⚡️ *Teledrive Premium Activated* \n\nYour cloud storage is successfully linked to this chat. Feel free to manage your files. \n\n⚙️ *Config:* \nBot: @${botName}\nChat ID: \`${chatId}\``,
        parse_mode: "Markdown",
      }),
    });
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

/**
 * High-performance file upload utilizing direct peer-to-peer browser-to-Telegram uploading.
 * Bypasses Express proxy server for blazing-fast direct uploads and uses XHR to stream real-time progress.
 */
export function uploadFileToTelegram(
  token: string,
  chatId: string,
  file: File,
  onProgress: (percent: number, speed: string, eta: string) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `https://api.telegram.org/bot${token.trim()}/sendDocument`;

    const formData = new FormData();
    formData.append("chat_id", chatId.trim());
    formData.append("document", file);

    const startTime = Date.now();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        const percent = Math.round((event.loaded / event.total) * 100);
        const elapsed = (Date.now() - startTime) / 1000; // in seconds
        const speedBytes = elapsed > 0 ? event.loaded / elapsed : 0;

        let speedString = "";
        if (speedBytes > 1024 * 1024) {
          speedString = `${(speedBytes / (1024 * 1024)).toFixed(1)} MB/s`;
        } else if (speedBytes > 1024) {
          speedString = `${(speedBytes / 1024).toFixed(0)} KB/s`;
        } else {
          speedString = `${speedBytes.toFixed(0)} B/s`;
        }

        const remainingBytes = event.total - event.loaded;
        const etaSeconds = speedBytes > 0 ? remainingBytes / speedBytes : 0;
        let etaString = "";
        if (etaSeconds > 60) {
          etaString = `${Math.floor(etaSeconds / 60)}m ${Math.round(etaSeconds % 60)}s`;
        } else {
          etaString = `${Math.round(etaSeconds)}s`;
        }

        onProgress(percent, speedString, etaString);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.ok) {
            resolve(res.result);
          } else {
            reject(new Error(res.description || "Telegram refused upload. Check if bot is an admin with sending powers."));
          }
        } catch {
          reject(new Error("Response decoding failed"));
        }
      } else {
        try {
          const res = JSON.parse(xhr.responseText);
          reject(new Error(res.description || `Status ${xhr.status}`));
        } catch {
          reject(new Error(`Server returned status code ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network connection lost or blocked by CORS Policy."));
    };

    xhr.open("POST", url);
    xhr.send(formData);
  });
}

/**
 * Pins a message inside a Telegram Chat.
 */
export async function pinChatMessage(token: string, chatId: string, messageId: number): Promise<boolean> {
  const url = `https://api.telegram.org/bot${token.trim()}/pinChatMessage`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId.trim(),
        message_id: messageId,
        disable_notification: true,
      }),
    });
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

/**
 * Sync / Backup full folder files and nested structure to the Telegram chat.
 * Generates an index file, sends it, and pins it for absolute durability.
 */
export async function backupMetadataToTelegram(
  token: string,
  chatId: string,
  state: { files: DriveFile[]; folders: DriveFolder[] }
): Promise<{ messageId: number; fileId: string } | null> {
  try {
    const serialized = JSON.stringify(state, null, 2);
    const blob = new Blob([serialized], { type: "application/json" });
    const file = new File([blob], `tg_drive_metadata.json`, { type: "application/json" });

    const formData = new FormData();
    formData.append("chat_id", chatId.trim());
    formData.append("document", file);
    formData.append("caption", "📡 [DO NOT DELETE] ZDrive Automatic Sync File #zdrive_metadata");

    const res = await fetch(`https://api.telegram.org/bot${token.trim()}/sendDocument`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!data.ok) {
      throw new Error(data.description || "Upload refused");
    }

    const messageId = data.result.message_id;
    const fileId = data.result.document.file_id;

    // Pin it so that it acts as the master record
    await pinChatMessage(token, chatId, messageId);

    return { messageId, fileId };
  } catch (err) {
    console.error("Backup to Telegram failed:", err);
    return null;
  }
}

/**
 * Restores full folder hierarchy from the Telegram Pinned Message index.
 * Completely cross-device sync!
 */
export async function restoreMetadataFromTelegram(
  token: string,
  chatId: string
): Promise<{ files: DriveFile[]; folders: DriveFolder[]; messageId?: number } | null> {
  try {
    // 1. Fetch Chat details containing pinned_message
    const chatUrl = `https://api.telegram.org/bot${token.trim()}/getChat?chat_id=${chatId.trim()}`;
    const chatRes = await fetch(chatUrl);
    if (!chatRes.ok) return null;

    const chatData = await chatRes.json();
    if (!chatData.ok || !chatData.result) return null;

    const pinnedMessage = chatData.result.pinned_message;
    if (!pinnedMessage || !pinnedMessage.document) {
      console.log("No pinned drive directory found inside chat history.");
      return null;
    }

    const doc = pinnedMessage.document;
    if (doc.file_name !== "tg_drive_metadata.json") {
      console.log("Found pinned file, but name doesn't match directory header.");
      return null;
    }

    const fileId = doc.file_id;
    const messageId = pinnedMessage.message_id;

    // 2. Download latest version of metadata via our proxy
    const proxyUrl = `/api/telegram/download?token=${token}&file_id=${fileId}&action=preview&filename=tg_drive_metadata.json`;
    const downloadRes = await fetch(proxyUrl);
    if (!downloadRes.ok) return null;

    const data = await downloadRes.json();
    if (data && Array.isArray(data.files) && Array.isArray(data.folders)) {
      return {
        files: data.files,
        folders: data.folders,
        messageId,
      };
    }
    return null;
  } catch (err) {
    console.error("Restore from Telegram failed:", err);
    return null;
  }
}

/**
 * Generates a protected, database-less base64 sharing link for a file.
 */
export function makeSharedLink(
  token: string,
  fileId: string,
  name: string,
  size: number,
  mimeType: string
): string {
  const payload = {
    token,
    fileId,
    name,
    size,
    mime: mimeType,
  };
  const json = JSON.stringify(payload);
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return `${window.location.origin}/?p=${base64}`;
}

