/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import Onboarding from "./components/Onboarding";
import Sidebar from "./components/Sidebar";
import FileExplorer from "./components/FileExplorer";
import FilePreviewModal from "./components/FilePreviewModal";
import ShareViewer from "./components/ShareViewer";
import { TelegramConfig, DriveFile, DriveFolder, ActiveUpload, SharedFilePayload } from "./types";
import { CloudLightning, ShieldCheck, RefreshCw, Layers } from "lucide-react";

export default function App() {
  // --- 1. ROUTING & SHARE ENGINE ---
  const [sharedPayload, setSharedPayload] = useState<SharedFilePayload | null>(null);
  const [isShareView, setIsShareView] = useState(false);

  useEffect(() => {
    // Check if URL search contains base64 payload "?p=..."
    const params = new URLSearchParams(window.location.search);
    const code = params.get("p");
    if (code) {
      try {
        const decoded = atob(code);
        const parsed = JSON.parse(decoded);
        if (parsed.token && parsed.fileId && parsed.name) {
          setSharedPayload({
            token: parsed.token,
            fileId: parsed.fileId,
            name: parsed.name,
            size: parsed.size || 0,
            mime: parsed.mime || "application/octet-stream"
          });
          setIsShareView(true);
        }
      } catch (err) {
        console.error("Failed to parse shared query payload:", err);
      }
    }
  }, []);

  // --- 2. STORAGE APP STATES ---
  const [config, setConfig] = useState<TelegramConfig | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);

  const [activeFile, setActiveFile] = useState<DriveFile | null>(null);
  const [activeUploads, setActiveUploads] = useState<ActiveUpload[]>([]);
  const [recentSyncTime, setRecentSyncTime] = useState<string | null>(null);

  // --- 3. PERSISTENCE LAYER ---
  useEffect(() => {
    // Read cached items from LocalStorage on mount
    const savedConfig = localStorage.getItem("tg_drive_config");
    const savedFiles = localStorage.getItem("tg_drive_files");
    const savedFolders = localStorage.getItem("tg_drive_folders");
    const savedSync = localStorage.getItem("tg_drive_synctime");

    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error(e);
      }
    }

    if (savedFiles) {
      try {
        setFiles(JSON.parse(savedFiles));
      } catch (e) {
        console.error(e);
      }
    }

    if (savedFolders) {
      try {
        setFolders(JSON.parse(savedFolders));
      } catch (e) {
        console.error(e);
      }
    }

    if (savedSync) {
      setRecentSyncTime(savedSync);
    }
  }, []);

  // Cache state to localStorage when folders or files update for instant load speeds
  const updateFilesState = (newFilesOrUpdater: DriveFile[] | ((prev: DriveFile[]) => DriveFile[])) => {
    setFiles(prev => {
      const updated = typeof newFilesOrUpdater === "function" ? newFilesOrUpdater(prev) : newFilesOrUpdater;
      localStorage.setItem("tg_drive_files", JSON.stringify(updated));
      return updated;
    });
  };

  const updateFoldersState = (newFoldersOrUpdater: DriveFolder[] | ((prev: DriveFolder[]) => DriveFolder[])) => {
    setFolders(prev => {
      const updated = typeof newFoldersOrUpdater === "function" ? newFoldersOrUpdater(prev) : newFoldersOrUpdater;
      localStorage.setItem("tg_drive_folders", JSON.stringify(updated));
      return updated;
    });
  };

  // --- 4. HANDLERS ---
  const handleOnboardingComplete = (
    newConfig: TelegramConfig,
    restoredData?: { files: DriveFile[]; folders: DriveFolder[] } | null
  ) => {
    setConfig(newConfig);
    localStorage.setItem("tg_drive_config", JSON.stringify(newConfig));

    if (restoredData) {
      if (restoredData.files) updateFilesState(restoredData.files);
      if (restoredData.folders) updateFoldersState(restoredData.folders);
      const time = new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      setRecentSyncTime(time);
      localStorage.setItem("tg_drive_synctime", time);
    } else {
      // Setup fresh directory
      updateFilesState([]);
      updateFoldersState([]);
    }
  };

  const handleDisconnect = () => {
    setConfig(null);
    setFiles([]);
    setFolders([]);
    setRecentSyncTime(null);
    localStorage.removeItem("tg_drive_config");
    localStorage.removeItem("tg_drive_files");
    localStorage.removeItem("tg_drive_folders");
    localStorage.removeItem("tg_drive_synctime");
  };

  const handleAddFolder = (name: string, parentId: string) => {
    const newFolder: DriveFolder = {
      id: Math.random().toString(36).substring(2, 11),
      name,
      parentId,
      createdAt: new Date().toISOString()
    };
    updateFoldersState(prev => [...prev, newFolder]);
  };

  const handleAddFile = (file: DriveFile) => {
    updateFilesState(prev => [file, ...prev]);
  };

  const handleDeleteFile = (id: string) => {
    updateFilesState(prev => prev.filter(f => f.id !== id));
  };

  const handleDeleteFolder = (id: string) => {
    const targetFolder = folders.find(f => f.id === id);
    const parent = targetFolder ? targetFolder.parentId : "root";

    updateFoldersState(prevFolders => {
      return prevFolders.map(fold => {
        if (fold.parentId === id) {
          return { ...fold, parentId: parent };
        }
        return fold;
      }).filter(fold => fold.id !== id);
    });

    updateFilesState(prevFiles => {
      return prevFiles.map(f => {
        if (f.parentId === id) {
          return { ...f, parentId: parent };
        }
        return f;
      });
    });
  };

  const handleRenameFile = (fileId: string, newName: string) => {
    updateFilesState(prev => prev.map(f => {
      if (f.id === fileId) {
        return { ...f, name: newName };
      }
      return f;
    }));
  };

  const handleSyncComplete = () => {
    const time = new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    setRecentSyncTime(time);
    localStorage.setItem("tg_drive_synctime", time);
  };

  // --- 5. PROGRESS UPLOADS STATE HANDLERS ---
  const handleUploadStart = (upload: ActiveUpload) => {
    setActiveUploads(prev => [upload, ...prev]);
  };

  const handleUploadProgress = (id: string, progress: number, speed: string, eta: string) => {
    setActiveUploads(prev => prev.map(u => {
      if (u.id === id) {
        return { ...u, progress, speed, eta };
      }
      return u;
    }));
  };

  const handleUploadComplete = (id: string) => {
    setActiveUploads(prev => prev.map(u => {
      if (u.id === id) {
        return { ...u, status: "completed", progress: 100 };
      }
      return u;
    }));
    // Clear completed upload logs after 3 seconds for cleaner aesthetic
    setTimeout(() => {
      setActiveUploads(prev => prev.filter(u => u.id !== id));
    }, 3000);
  };

  const handleUploadError = (id: string, error: string) => {
    setActiveUploads(prev => prev.map(u => {
      if (u.id === id) {
        return { ...u, status: "error", error };
      }
      return u;
    }));
    // Keep errors showing slightly longer, clear after 10 seconds
    setTimeout(() => {
      setActiveUploads(prev => prev.filter(u => u.id !== id));
    }, 10000);
  };

  const handleImportSharedFile = (importedFile: DriveFile) => {
    updateFilesState([importedFile, ...files]);
    // Close the share view and redirect back to dashboard
    setIsShareView(false);
    window.history.pushState({}, document.title, window.location.pathname);
  };

  // --- 6. RENDER ROUTES DISPATCHER ---
  if (isShareView && sharedPayload) {
    return (
      <ShareViewer 
        payload={sharedPayload} 
        onImport={handleImportSharedFile}
        isLoggedIn={config !== null}
      />
    );
  }

  if (!config) {
    return (
      <Onboarding 
        onComplete={handleOnboardingComplete} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col h-screen" id="app-root">
      
      {/* 1. Global Header Navigation bar */}
      <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between shrink-0 shadow-xs" id="app-global-header">
        
        <div className="flex items-center gap-3" id="app-logo-box">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg" id="headline-logo">
            <CloudLightning className="w-5 h-5 animate-pulse text-white" />
          </div>
          <div>
            <h1 className="text-md font-display font-bold tracking-tight text-slate-800 leading-none">ZDrive</h1>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">Enterprise Cloud Systems</span>
          </div>
        </div>

        {/* Sync telemetry badges */}
        <div className="flex items-center gap-3" id="app-telemetry-box">
          {recentSyncTime ? (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-100 text-green-600 rounded-full text-[10px] font-mono font-semibold" id="app-sync-indicator-pill">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Synced Backup {recentSyncTime}</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-full text-[10px] font-mono" id="app-unsynced-indicator-pill">
              <Layers className="w-3.5 h-3.5" />
              <span>Offline Local Dir</span>
            </div>
          )}

          {/* Connected bot status */}
          <div className="text-right text-xs" id="header-user-badge">
            <span className="text-slate-400 font-mono text-[9px] uppercase block tracking-wider leading-none">Status</span>
            <span className="text-green-600 font-bold block mt-0.5 leading-none">● Secure Space</span>
          </div>
        </div>

      </header>

      {/* 2. Main content grids splits */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden" id="app-layouts-container">
        
        {/* Left column sidebar settings info */}
        <Sidebar 
          config={config} 
          files={files}
          folders={folders}
          onSyncComplete={handleSyncComplete}
          onDisconnect={handleDisconnect}
        />

        {/* Right column file structures directory panel */}
        <FileExplorer 
          files={files}
          folders={folders}
          botToken={config.botToken}
          chatId={config.chatId}
          onAddFolder={handleAddFolder}
          onAddFile={handleAddFile}
          onDeleteFile={handleDeleteFile}
          onDeleteFolder={handleDeleteFolder}
          onFileClick={(file) => setActiveFile(file)}
          activeUploads={activeUploads}
          onUploadStart={handleUploadStart}
          onUploadProgress={handleUploadProgress}
          onUploadComplete={handleUploadComplete}
          onUploadError={handleUploadError}
        />

      </div>

      {/* 3. Global File Previewers Overlays Modal */}
      {activeFile && (
        <FilePreviewModal 
          file={activeFile}
          botToken={config.botToken}
          onClose={() => setActiveFile(null)}
          onDelete={handleDeleteFile}
          onRename={handleRenameFile}
        />
      )}

    </div>
  );
}
