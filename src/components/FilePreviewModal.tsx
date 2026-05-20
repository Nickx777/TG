/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { DriveFile } from "../types";
import { makeSharedLink } from "../lib/telegram";
import ConfirmationDialog from "./ConfirmationDialog";
import { 
  X, 
  Download, 
  Share2, 
  Trash2, 
  Edit3, 
  Copy, 
  Check, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Music, 
  File, 
  Clock, 
  HardDrive, 
  Loader2,
  Calendar
} from "lucide-react";

interface FilePreviewModalProps {
  file: DriveFile;
  botToken: string;
  onClose: () => void;
  onDelete: (fileId: string) => void;
  onRename: (fileId: string, newName: string) => void;
}

export default function FilePreviewModal({ 
  file, 
  botToken, 
  onClose, 
  onDelete, 
  onRename 
}: FilePreviewModalProps) {
  const [copied, setCopied] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(file.name);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const downloadUrl = `/api/telegram/download?token=${botToken}&file_id=${file.telegramFileId}&action=download&filename=${encodeURIComponent(file.name)}`;
  const previewUrl = `/api/telegram/download?token=${botToken}&file_id=${file.telegramFileId}&action=preview&filename=${encodeURIComponent(file.name)}`;

  useEffect(() => {
    // Check if text/code
    const isText = file.mimeType.startsWith("text/") || 
                   file.name.endsWith(".json") || 
                   file.name.endsWith(".js") || 
                   file.name.endsWith(".ts") || 
                   file.name.endsWith(".html") || 
                   file.name.endsWith(".css") || 
                   file.name.endsWith(".md") || 
                   file.name.endsWith(".py") || 
                   file.name.endsWith(".txt");

    if (isText) {
      setTextLoading(true);
      fetch(previewUrl)
        .then(res => {
          if (res.ok) return res.text();
          throw new Error();
        })
        .then(text => {
          if (text.length > 50000) {
            setTextContent(text.substring(0, 50000) + "\n\n... [Content truncated for speed] ...");
          } else {
            setTextContent(text);
          }
        })
        .catch(() => {
          setTextContent("Failed to load text content preview.");
        })
        .finally(() => {
          setTextLoading(false);
        });
    } else {
      setTextContent(null);
    }
  }, [file.telegramFileId, file.mimeType, file.name, previewUrl]);

  const handleGenerateShareLink = () => {
    const link = makeSharedLink(botToken, file.telegramFileId, file.name, file.size, file.mimeType);
    setShareLink(link);
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveRename = () => {
    if (editedName.trim() && editedName.trim() !== file.name) {
      onRename(file.id, editedName.trim());
      setIsEditingName(false);
    }
  };

  const formattedSize = (() => {
    const bytes = file.size;
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  })();

  const formatUploadedDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const isImage = file.mimeType.startsWith("image/");
  const isVideo = file.mimeType.startsWith("video/");
  const isAudio = file.mimeType.startsWith("audio/");
  const isPDF = file.mimeType === "application/pdf";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="modal-container-root">
      {/* Dark overlay with blurred background */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} id="modal-overlay" />

      {/* Main Modal Box Container with slide-in animation */}
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh] md:max-h-[80vh] animate-scale-up" id="modal-body">
        
        {/* UPPER/CLOSE CONTROL (Floating) */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-305 rounded-xl transition-all cursor-pointer shadow-sm"
          id="modal-close-button"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Left Hand Section: Media/Document content viewport */}
        <div className="flex-1 bg-slate-50 p-6 flex items-center justify-center min-h-[280px] md:min-h-[400px] border-b md:border-b-0 md:border-r border-slate-200 relative group select-none" id="modal-viewport-section">
          
          <div className="absolute top-4 left-6 text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold" id="modal-viewport-tag">
            👁️ Drive Vault Inline Decoder
          </div>

          <div className="w-full h-full max-h-[480px] flex items-center justify-center pt-6 overflow-hidden" id="modal-responsive-viewport">
            {isImage && (
              <img 
                src={previewUrl} 
                alt={file.name} 
                className="max-w-full max-h-[380px] object-contain rounded-lg shadow-lg border border-slate-200"
                referrerPolicy="no-referrer"
                id="modal-viewport-img"
              />
            )}

            {isVideo && (
              <video 
                src={previewUrl} 
                controls 
                className="max-w-full max-h-[380px] aspect-video bg-black rounded-lg border border-slate-200 shadow-lg object-contain"
                preload="metadata"
                id="modal-viewport-video"
              />
            )}

            {isAudio && (
              <div className="w-full max-w-sm bg-white border border-slate-200 p-6 rounded-2xl text-center space-y-4 shadow-sm flex flex-col items-center" id="modal-viewport-audio">
                <div className="w-14 h-14 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-blue-600 animate-pulse" id="midi-icon">
                  <Music className="w-6 h-6" />
                </div>
                <div className="space-y-1 w-full" id="modal-audio-meta-box">
                  <p className="text-xs text-slate-800 font-bold truncate px-4" title={file.name}>{file.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">TG API Player Stream</p>
                </div>
                <audio 
                  src={previewUrl} 
                  controls 
                  className="w-full"
                  preload="auto"
                  id="modal-audio-player"
                />
              </div>
            )}

            {isPDF && (
              <iframe 
                src={previewUrl} 
                className="w-full h-[380px] rounded-lg border border-slate-200 bg-white"
                title={file.name}
                id="modal-pdf-iframe"
              />
            )}

            {textContent !== null && (
              <div className="w-full h-[350px] bg-slate-100 border border-slate-200 rounded-xl p-4 overflow-y-auto font-mono text-[11px] text-slate-700 select-text text-left leading-relaxed relative" id="modal-viewport-text">
                {textLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center" id="modal-text-loader">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap break-all pr-2">{textContent}</pre>
                )}
              </div>
            )}

            {!isImage && !isVideo && !isAudio && !isPDF && textContent === null && (
              <div className="text-center space-y-3.5 max-w-xs animate-fade-in" id="modal-fallback-section">
                <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center mx-auto text-slate-400 shadow-sm" id="fallback-midi">
                  <File className="w-7 h-7 text-blue-600" />
                </div>
                <div className="space-y-1" id="fallback-midi-words">
                  <h4 className="text-sm font-semibold text-slate-800">Interactive Preview Unavailable</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    This file must be processed in secondary software environments. Download to parse content.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Hand Section: Metadata, Control dashboard & Renames */}
        <div className="w-full md:w-[320px] p-6 flex flex-col justify-between bg-slate-50/40" id="modal-dashboard-section">
          
          <div className="space-y-6" id="modal-dashboard-details">
            {/* Title / Name editing field */}
            <div className="space-y-2 mt-4" id="title-editor-wrap">
              <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider block font-bold">Document Title</span>
              {isEditingName ? (
                <div className="space-y-2" id="is-editing-display">
                  <input 
                    type="text" 
                    className="w-full bg-white border border-slate-250 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveRename()}
                    autoFocus
                    id="rename-input-box"
                  />
                  <div className="flex gap-1.5 justify-end" id="rename-save-actions">
                    <button 
                      onClick={() => { setIsEditingName(false); setEditedName(file.name); }}
                      className="text-[10px] font-semibold text-slate-500 hover:text-slate-800 px-2.5 py-1 border border-transparent rounded bg-slate-100"
                      id="cancel-rename-btn"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveRename}
                      className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 px-2.5 py-1 border border-blue-100 rounded bg-blue-50"
                      id="save-rename-btn"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 group" id="no-editing-display">
                  <h3 className="text-sm font-bold text-slate-800 break-all leading-snug line-clamp-2 pr-4">{file.name}</h3>
                  <button 
                    onClick={() => setIsEditingName(true)}
                    className="p-1 hover:bg-slate-100 hover:text-blue-600 text-slate-400 rounded transition"
                    title="Rename file title"
                    id="rename-trigger-btn"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Micro Details specifications list */}
            <div className="space-y-3.5 bg-white border border-slate-200 p-4 rounded-xl" id="modal-specs-list">
              <div className="flex items-center gap-2" id="spec-size">
                <HardDrive className="w-3.5 h-3.5 text-slate-405 shrink-0" />
                <div className="text-[11px]" id="spec-size-inner">
                  <p className="text-[9px] uppercase tracking-wide font-mono text-slate-400 leading-none font-bold">File Weight</p>
                  <p className="text-slate-700 font-bold font-mono mt-0.5">{formattedSize}</p>
                </div>
              </div>

              <div className="flex items-center gap-2" id="spec-date">
                <Calendar className="w-3.5 h-3.5 text-slate-405 shrink-0" />
                <div className="text-[11px]" id="spec-date-inner">
                  <p className="text-[9px] uppercase tracking-wide font-mono text-slate-400 leading-none font-bold">Created At</p>
                  <p className="text-slate-700 mt-0.5">{formatUploadedDate(file.uploadedAt)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2" id="spec-mime">
                <Clock className="w-3.5 h-3.5 text-slate-405 shrink-0" />
                <div className="text-[11px]" id="spec-mime-inner">
                  <p className="text-[9px] uppercase tracking-wide font-mono text-slate-400 leading-none font-bold">Content Stream Code</p>
                  <p className="text-slate-700 truncate font-mono text-[10px] mt-0.5" title={file.mimeType}>
                    {file.mimeType || "application/octet-stream"}
                  </p>
                </div>
              </div>
            </div>

            {/* Sharing Link Generator Card (active if built) */}
            {shareLink && (
              <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 animate-fade-in shadow-xs" id="share-link-display-panel">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-mono block font-bold">Shareable Protected Link</span>
                <div className="flex gap-1.5 items-center bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg overflow-hidden" id="sh-link">
                  <span className="text-[10px] text-slate-600 font-mono truncate flex-1">{shareLink}</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(shareLink);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded transition"
                    id="copy-gen-link-btn"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Control Actions (Download, Delete, Share) */}
          <div className="space-y-3 pt-6 border-t border-slate-200" id="modal-dashboard-actions">
            
            <a 
              href={downloadUrl}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-100 cursor-pointer"
              id="dash-download-anchor"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download file</span>
            </a>

            <div className="grid grid-cols-2 gap-2" id="grid-controls">
              <button 
                onClick={handleGenerateShareLink}
                className="bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 text-slate-705 font-semibold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                id="dash-share-btn"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" /> : <Share2 className="w-3.5 h-3.5 text-slate-505" />}
                <span>Share link</span>
              </button>

              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 font-semibold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                id="dash-delete-btn"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>

          </div>

        </div>

      </div>

      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        title="Delete File Reference"
        message="Are you sure you want to delete this file reference from the drive? (The file remains securely stored/encrypted on your agent's private logs node)"
        confirmText="Confirm Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={() => {
          onDelete(file.id);
          setShowDeleteConfirm(false);
          onClose(); // close the file preview modal as well
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
