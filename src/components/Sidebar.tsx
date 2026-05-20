/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { TelegramConfig, DriveFile, DriveFolder } from "../types";
import { backupMetadataToTelegram, restoreMetadataFromTelegram } from "../lib/telegram";
import { 
  Cloud, 
  Bot, 
  Send, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  HardDrive, 
  HelpCircle,
  ExternalLink,
  ShieldAlert,
  Download,
  XCircle
} from "lucide-react";

interface SidebarProps {
  config: TelegramConfig;
  files: DriveFile[];
  folders: DriveFolder[];
  onSyncComplete: (restoredCount?: { files: number; folders: number }) => void;
  onDisconnect: () => void;
  onRestoreComplete: (data: { files: DriveFile[]; folders: DriveFolder[]; messageId?: number }) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ 
  config, 
  files, 
  folders, 
  onSyncComplete,
  onDisconnect,
  onRestoreComplete,
  mobileOpen = false,
  onCloseMobile
}: SidebarProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [restoring, setRestoring] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const formattedTotalSize = (() => {
    const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
    if (totalBytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(totalBytes) / Math.log(k));
    return parseFloat((totalBytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  })();

  const handleSyncBackup = async () => {
    setSyncing(true);
    setSyncSuccess(null);
    setSyncError(null);
    try {
      const res = await backupMetadataToTelegram(config.botToken, config.chatId, { files, folders });
      if (res) {
        const time = new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
        setSyncSuccess(`Success! Index pinned at ${time}`);
        onSyncComplete();
      } else {
        setSyncError("Sync failed. Check Bot permissions.");
      }
    } catch {
      setSyncError("Network error backing up structure.");
    } finally {
      setSyncing(false);
    }
  };

  const handleRestoreBackup = async () => {
    setRestoring(true);
    setRestoreSuccess(null);
    setRestoreError(null);
    try {
      const data = await restoreMetadataFromTelegram(config.botToken, config.chatId);
      if (data && Array.isArray(data.files)) {
        onRestoreComplete(data);
        const time = new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
        setRestoreSuccess(`Restored ${data.files.length} items successfully!`);
      } else {
        setRestoreError("No layout backup found in your secure vault.");
      }
    } catch {
      setRestoreError("Server handshake failed. Access denied.");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300 animate-fade-in" 
          onClick={onCloseMobile}
          id="sidebar-mobile-backdrop"
        />
      )}

      <div className={`
        fixed inset-y-0 left-0 w-[285px] bg-white z-50 p-6 flex flex-col justify-between shrink-0 border-r border-slate-200 shadow-2xl lg:shadow-none h-full
        transition-transform duration-300 ease-in-out lg:static lg:translate-x-0
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
      `} id="sidebar-root">
        
        {/* Mobile Header Close block */}
        <div className="flex lg:hidden items-center justify-between pb-4 border-b border-slate-100 mb-6 shrink-0" id="sidebar-mobile-header">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-600 animate-pulse" />
            <span className="text-xs font-bold font-mono text-slate-800 uppercase tracking-widest">Drive Config</span>
          </div>
          <button 
            onClick={onCloseMobile}
            className="p-1 px-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            id="close-sidebar-mobile-btn"
            title="Close Settings"
          >
            <XCircle className="w-5 h-5 text-slate-400 hover:text-rose-600" />
          </button>
        </div>

        {/* Upper Half: Identity and metrics */}
        <div className="space-y-8 overflow-y-auto pr-1" id="sidebar-upper-half">
        
        {/* Manual Cloud Auto Sync */}
        <div className="space-y-3" id="manual-sync-section">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold">Drive Registry Sync</span>
          
          <button 
            onClick={handleSyncBackup}
            disabled={syncing || restoring}
            className="w-full bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 text-slate-700 font-semibold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-45"
            id="sync-backup-btn"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-blue-600" : "text-slate-500"}`} />
            <span>Backup Folder Structure</span>
          </button>

          <button 
            onClick={handleRestoreBackup}
            disabled={restoring || syncing}
            className="w-full bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-slate-700 font-semibold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-45"
            id="sync-restore-btn"
          >
            <Download className={`w-3.5 h-3.5 ${restoring ? "animate-spin text-blue-600" : "text-slate-400"}`} />
            <span>Restore From Cloud Backup</span>
          </button>

          {syncSuccess && (
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg font-semibold" id="sidebar-sync-success">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{syncSuccess}</span>
            </div>
          )}

          {syncError && (
            <div className="flex items-center gap-1.5 text-[10px] text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded-lg font-semibold" id="sidebar-sync-error">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{syncError}</span>
            </div>
          )}

          {restoreSuccess && (
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg font-semibold" id="sidebar-restore-success">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{restoreSuccess}</span>
            </div>
          )}

          {restoreError && (
            <div className="flex items-center gap-1.5 text-[10px] text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded-lg font-semibold" id="sidebar-restore-error">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{restoreError}</span>
            </div>
          )}
        </div>

      </div>

      {/* Lower Half: Space limits and SLA tracker */}
      <div className="pt-6 border-t border-slate-200 mt-8 space-y-3" id="sidebar-lower-half">
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold">Drive Personal SLA</span>
        
        <div className="bg-slate-50 border border-slate-200 px-4 py-3.5 rounded-2xl space-y-3" id="sla-interior">
          <div className="flex items-center gap-2" id="sla-header">
            <HardDrive className="w-4 h-4 text-blue-600" />
            <div id="sla-heading-words">
              <p className="text-[10px] text-slate-400 font-mono uppercase">Storage Capacity</p>
              <p className="text-xs text-slate-800 font-bold font-mono">Infinite Cloud</p>
            </div>
          </div>

          <div className="space-y-1.5" id="meter-gauge">
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden" id="gauge-bg">
              <div className="h-full bg-blue-600 rounded-full animate-pulse" style={{ width: "8%" }} id="gauge-bar" />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono" id="gauge-text">
              <span>{formattedTotalSize} Used</span>
              <span>∞ Limit</span>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 leading-normal" id="sla-disclaimer">
            Powered by ZDrive Secure Agents. Document attachments suffer zero expiration timelines. Direct uploads up to **50MB** allowed.
          </p>
        </div>
      </div>

    </div>
    </>
  );
}
