/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { SharedFilePayload, DriveFile } from "../types";
import { 
  Download, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Music, 
  File, 
  Import, 
  Copy, 
  Check, 
  ExternalLink,
  Loader2,
  AlertTriangle,
  Github,
  CloudLightning
} from "lucide-react";

interface ShareViewerProps {
  payload: SharedFilePayload;
  onImport: (file: DriveFile) => void;
  isLoggedIn: boolean;
}

export default function ShareViewer({ payload, onImport, isLoggedIn }: ShareViewerProps) {
  const [loadingText, setLoadingText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);

  const { token, fileId, name, size, mime } = payload;

  const downloadUrl = `/api/telegram/download?token=${token}&file_id=${fileId}&action=download&filename=${encodeURIComponent(name)}`;
  const previewUrl = `/api/telegram/download?token=${token}&file_id=${fileId}&action=preview&filename=${encodeURIComponent(name)}`;

  useEffect(() => {
    // If it's a text file, download the text immediately to display
    const isText = mime.startsWith("text/") || 
                   name.endsWith(".json") || 
                   name.endsWith(".js") || 
                   name.endsWith(".ts") || 
                   name.endsWith(".html") || 
                   name.endsWith(".css") || 
                   name.endsWith(".md") || 
                   name.endsWith(".py") || 
                   name.endsWith(".txt");

    if (isText) {
      setTextLoading(true);
      fetch(previewUrl)
        .then(res => {
          if (res.ok) return res.text();
          throw new Error();
        })
        .then(text => {
          // Truncate text if extremely massive
          if (text.length > 50000) {
            setTextContent(text.substring(0, 50000) + "\n\n... [Content truncated for display speed] ...");
          } else {
            setTextContent(text);
          }
        })
        .catch(() => {
          setTextContent("Unable to read text file preview inside frame.");
        })
        .finally(() => {
          setTextLoading(false);
        });
    }
  }, [fileId, mime, name, previewUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedSize = (() => {
    if (size === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(size) / Math.log(k));
    return parseFloat((size / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  })();

  const handleImportFile = () => {
    setLoadingText("Importing to your storage vault...");
    const driveFile: DriveFile = {
      id: Math.random().toString(36).substring(2, 11),
      name: name,
      size: size,
      mimeType: mime,
      telegramFileId: fileId,
      uploadedAt: new Date().toISOString(),
      parentId: "root"
    };
    
    setTimeout(() => {
      onImport(driveFile);
      setLoadingText(null);
      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 3000);
    }, 1000);
  };

  const isImage = mime.startsWith("image/");
  const isVideo = mime.startsWith("video/");
  const isAudio = mime.startsWith("audio/");
  const isPDF = mime === "application/pdf";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between" id="share-root">
      
      {/* Upper Navigation Bar */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between shadow-xs" id="share-header">
        <div className="flex items-center gap-2.5" id="share-header-left">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg" id="share-logo-box">
            <CloudLightning className="w-5 h-5 animate-pulse text-white" />
          </div>
          <div>
            <span className="text-sm font-bold text-slate-800 tracking-tight block leading-none">ZDrive</span>
            <span className="text-[10px] text-slate-400 font-mono">Premium Link Protection</span>
          </div>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-1.5" id="share-header-right">
          <Github className="w-4 h-4 cursor-pointer hover:text-slate-700 transition-colors" />
          <span>v1.2.0</span>
        </div>
      </header>

      {/* Main Sharing Contents Grid */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 md:py-12 flex flex-col md:flex-row gap-8 items-center justify-center justify-items-center" id="share-main">
        
        {/* Left Aspect: File Card Details and Download Buttons */}
        <div className="w-full md:w-[350px] shadow-lg bg-white border border-slate-205 rounded-2xl p-6 flex flex-col justify-between" id="share-sidebar">
          
          <div className="space-y-6" id="share-sidebar-meta">
            <div className="text-center" id="share-display-file-icon">
              <div className="inline-flex p-5 bg-slate-50 border border-slate-100 rounded-2xl text-blue-600 mb-4 shadow-xs" id="icon-box-3d">
                {isImage && <ImageIcon className="w-12 h-12" />}
                {isVideo && <Video className="w-12 h-12" />}
                {isAudio && <Music className="w-12 h-12" />}
                {isPDF && <FileText className="w-12 h-12" />}
                {!isImage && !isVideo && !isAudio && !isPDF && <File className="w-12 h-12" />}
              </div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight leading-snug break-all line-clamp-2" title={name} id="share-file-name">
                {name}
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-1" id="share-file-size">Weight: {formattedSize}</p>
            </div>

            <div className="border-t border-b border-slate-100 py-4 text-xs text-slate-500 space-y-2.5 font-sans" id="protection-list">
              <div className="flex justify-between" id="prot-type">
                <span>File Format:</span>
                <span className="text-slate-800 font-semibold break-all text-right">{mime || "Binary Type"}</span>
              </div>
              <div className="flex justify-between" id="prot-source">
                <span>Distributed host:</span>
                <span className="text-slate-800 font-semibold">ZDrive Secure Space</span>
              </div>
              <div className="flex justify-between" id="prot-speed">
                <span>SLA Download:</span>
                <span className="text-green-600 font-bold">Unrestricted Unlimited</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 mt-8" id="share-actions-container">
            {/* Primary Download trigger (hits proxy endpoint) */}
            <a 
              href={downloadUrl}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-100 hover:shadow-blue-200/50"
              id="raw-download-btn"
            >
              <Download className="w-4 h-4" />
              <span>Download File</span>
            </a>

            {/* Copy Share URL trigger */}
            <button 
              onClick={handleCopyLink}
              className="w-full bg-white hover:bg-slate-50 border border-slate-205 text-slate-700 py-3 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:bg-slate-100"
              id="copy-payload-url-btn"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 font-bold" />
                  <span className="text-emerald-605 font-bold">Share Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>Copy Protected Share Link</span>
                </>
              )}
            </button>

            {/* Import options (active if user is logged in) */}
            {isLoggedIn ? (
              <button 
                onClick={handleImportFile}
                disabled={!!loadingText}
                className="w-full bg-amber-50 hover:bg-amber-100 border border-amber-200/40 text-amber-700 py-3 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                id="import-drive-file-btn"
              >
                {loadingText ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-750" />
                ) : importSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                    <span className="text-[#059669]">Imported to Vault!</span>
                  </>
                ) : (
                  <>
                    <Import className="w-3.5 h-3.5" />
                    <span>Import to My Storage</span>
                  </>
                )}
              </button>
            ) : (
              <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl text-center" id="not-auth-login-hint">
                <p className="text-[10px] text-slate-400 leading-normal">
                  Got secure bot configurations? Reload from main parameters to unlock instant vault migrations.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Right Aspect: Fully functional Previews panel */}
        <div className="flex-1 w-full bg-white border border-slate-200 rounded-2xl p-6 min-h-[450px] flex flex-col justify-center items-center relative overflow-hidden shadow-md" id="share-display-preview">
          
          <div className="absolute top-4 left-6 text-slate-400 font-mono text-[10px] uppercase tracking-wider font-bold" id="preview-active-tag">
            👁️ Document Live Preview Layer
          </div>

          <div className="w-full h-full flex items-center justify-center pt-6" id="preview-content-port">
            {isImage && (
              <div className="relative group max-w-full max-h-[400px]" id="preview-image-node">
                <img 
                  src={previewUrl} 
                  alt={name} 
                  className="rounded-xl max-w-full max-h-[380px] object-contain shadow-lg border border-slate-200"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    // Fallback in case of issue
                    e.currentTarget.style.display = "none";
                    const pNode = document.getElementById("img-fallback-node");
                    if (pNode) pNode.style.display = "flex";
                  }}
                  id="preview-img"
                />
                <div className="hidden bg-white border border-slate-200 p-4 rounded-xl text-center space-y-2 flex-col items-center shadow-xs animate-pulse" id="img-fallback-node">
                  <AlertTriangle className="w-10 h-10 text-amber-500 animate-bounce" />
                  <p className="text-xs text-slate-500 font-sans">Preview blocked by link constraints. Download to view.</p>
                </div>
              </div>
            )}

            {isVideo && (
              <div className="w-full aspect-video max-h-[380px] bg-black rounded-xl overflow-hidden border border-slate-200 shadow-lg relative group" id="preview-video-node">
                <video 
                  src={previewUrl} 
                  controls 
                  className="w-full h-full object-contain"
                  controlsList="nodownload"
                  preload="metadata"
                  id="preview-video"
                />
              </div>
            )}

            {isAudio && (
              <div className="w-full max-w-sm bg-slate-50 border border-slate-200 p-6 rounded-2xl text-center shadow-sm flex flex-col items-center space-y-4" id="preview-audio-node">
                <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-blue-600 animate-pulse" id="audio-disc">
                  <Music className="w-7 h-7 text-blue-600" />
                </div>
                <div className="space-y-1 w-full text-center" id="audiometa-box">
                  <p className="text-sm text-slate-850 font-bold truncate leading-normal" title={name}>{name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">Streaming Secure Cloud Channel</p>
                </div>
                <audio 
                  src={previewUrl} 
                  controls 
                  className="w-full"
                  preload="auto"
                  id="preview-audio"
                />
              </div>
            )}

            {isPDF && (
              <div className="w-full h-[400px] rounded-xl overflow-hidden border border-slate-200 bg-white flex flex-col justify-between shadow-xs" id="preview-pdf-node">
                <iframe 
                  src={previewUrl} 
                  className="w-full h-full border-0 bg-white" 
                  title={name}
                  id="preview-pdf-frame"
                />
              </div>
            )}

            {textContent !== null && (
              <div className="w-full h-[380px] bg-slate-100 border border-slate-200 rounded-xl p-4 overflow-y-auto font-mono text-xs text-slate-700 select-text text-left leading-relaxed relative shadow-inner" id="preview-text-node">
                {textLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center" id="text-loader">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap break-all pr-2">{textContent}</pre>
                )}
              </div>
            )}

            {/* Binary fallback */}
            {!isImage && !isVideo && !isAudio && !isPDF && textContent === null && (
              <div className="text-center space-y-4 max-w-xs animate-fade-in" id="preview-fallback-node">
                <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto text-slate-400 shadow-sm" id="fallback-3d-box">
                  <File className="w-8 h-8 text-blue-600" />
                </div>
                <div className="space-y-1.5" id="fallback-words">
                  <h4 className="text-sm font-semibold text-slate-800">Preview Unavailable</h4>
                  <p className="text-xs text-slate-400 leading-normal">
                    This file format is designed for offline desktop software. Download to parse and execute.
                  </p>
                </div>
                <a 
                  href={downloadUrl}
                  className="inline-flex bg-slate-105 hover:bg-slate-200 active:bg-slate-300 border border-slate-250 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  id="fallback-download-anchor"
                >
                  <Download className="w-3.5 h-3.5" />
                  Verify File Raw
                </a>
              </div>
            )}
          </div>

        </div>

      </main>

      {/* Footer Branding */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400 shadow-inner" id="share-footer">
        <p className="mb-1 font-semibold text-slate-500">⚡️ ZDrive Cloud Storage Network</p>
        <p className="font-mono text-[10px] text-slate-400">Secure end-to-end routing without middleman retention limits.</p>
      </footer>

    </div>
  );
}
