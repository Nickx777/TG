/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { DriveFile, DriveFolder, ActiveUpload } from "../types";
import { uploadFileToTelegram } from "../lib/telegram";
import ConfirmationDialog from "./ConfirmationDialog";
import { 
  FolderPlus, 
  Upload, 
  Search, 
  ArrowUpDown, 
  ChevronRight, 
  Folder, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Music, 
  File, 
  Download, 
  Share2, 
  Trash2, 
  Plus, 
  Loader2, 
  MoreVertical, 
  FileCode,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";

interface FileExplorerProps {
  files: DriveFile[];
  folders: DriveFolder[];
  botToken: string;
  chatId: string;
  onAddFolder: (name: string, parentId: string) => void;
  onAddFile: (file: DriveFile) => void;
  onDeleteFile: (id: string) => void;
  onDeleteFolder: (id: string) => void;
  onFileClick: (file: DriveFile) => void;
  activeUploads: ActiveUpload[];
  onUploadStart: (upload: ActiveUpload) => void;
  onUploadProgress: (id: string, progress: number, speed: string, eta: string) => void;
  onUploadComplete: (id: string) => void;
  onUploadError: (id: string, error: string) => void;
}

export default function FileExplorer({
  files,
  folders,
  botToken,
  chatId,
  onAddFolder,
  onAddFile,
  onDeleteFile,
  onDeleteFolder,
  onFileClick,
  activeUploads,
  onUploadStart,
  onUploadProgress,
  onUploadComplete,
  onUploadError
}: FileExplorerProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string>("root");
  const [searchQuery, setSearchQuery] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "size" | "date">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isDragOver, setIsDragOver] = useState(false);

  // States for custom delete confirmations
  const [deleteConfirmType, setDeleteConfirmType] = useState<"file" | "folder" | null>(null);
  const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);
  const [itemToDeleteName, setItemToDeleteName] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Recursive Tree Traversal for deep breadcrumb construction
  const crumbs = (() => {
    const arr: { id: string; name: string }[] = [];
    let currentId = currentFolderId;
    while (currentId !== "root") {
      const f = folders.find((folder) => folder.id === currentId);
      if (f) {
        arr.unshift({ id: f.id, name: f.name });
        currentId = f.parentId;
      } else {
        break;
      }
    }
    arr.unshift({ id: "root", name: "My Drive" });
    return arr;
  })();

  // 2. Identify immediately displayed Folders/Files (Filtered by current folder ID & Search Query)
  const displayedFolders = folders.filter((folder) => {
    if (folder.parentId !== currentFolderId) return false;
    if (searchQuery) {
      return folder.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const displayedFiles = files.filter((file) => {
    if (file.parentId !== currentFolderId) return false;
    if (searchQuery) {
      return file.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // 3. Sorting operation
  const sortedFiles = [...displayedFiles].sort((a, b) => {
    let valA: any = a[sortBy === "date" ? "uploadedAt" : sortBy === "size" ? "size" : "name"];
    let valB: any = b[sortBy === "date" ? "uploadedAt" : sortBy === "size" ? "size" : "name"];

    if (sortBy === "date") {
      valA = new Date(valA).getTime();
      valB = new Date(valB).getTime();
    } else if (sortBy === "name") {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }

    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onAddFolder(newFolderName.trim(), currentFolderId);
      setNewFolderName("");
      setShowFolderInput(false);
    }
  };

  // 4. Client-side Drag & Drop and Upload orchestrator
  const uploadSingleFile = async (rawFile: File) => {
    // Standard size inspection (supported up to 50MB documents)
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    if (rawFile.size > MAX_SIZE) {
      alert(`"${rawFile.name}" exceeds the 50MB space upload limit. Please split the file or choose a smaller one.`);
      return;
    }

    const uploadId = Math.random().toString(36).substring(2, 11);
    
    // Mount upload tracking state immediately
    onUploadStart({
      id: uploadId,
      name: rawFile.name,
      size: rawFile.size,
      progress: 0,
      speed: "0 KB/s",
      eta: "calculating...",
      status: "uploading"
    });

    try {
      const res = await uploadFileToTelegram(
        botToken,
        chatId,
        rawFile,
        (progress, speed, eta) => {
          onUploadProgress(uploadId, progress, speed, eta);
        }
      );

      // Construct a valid directory DriveFile schema matching database structure
      const newDriveFile: DriveFile = {
        id: Math.random().toString(36).substring(2, 11),
        name: rawFile.name,
        size: rawFile.size,
        mimeType: rawFile.type || "application/octet-stream",
        telegramFileId: res.document.file_id,
        uploadedAt: new Date().toISOString(),
        parentId: currentFolderId,
        messageId: res.message_id
      };

      onAddFile(newDriveFile);
      onUploadComplete(uploadId);
    } catch (err: any) {
      console.error(err);
      onUploadError(uploadId, err.message || "Failed uploading file");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(uploadSingleFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      Array.from(e.dataTransfer.files).forEach(uploadSingleFile);
    }
  };

  const formattedSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getFileIcon = (mime: string, name: string) => {
    if (mime.startsWith("image/")) return <ImageIcon className="w-5 h-5 text-emerald-400" />;
    if (mime.startsWith("video/")) return <Video className="w-5 h-5 text-pink-400" />;
    if (mime.startsWith("audio/")) return <Music className="w-5 h-5 text-indigo-400" />;
    
    const isCode = name.endsWith(".js") || name.endsWith(".ts") || name.endsWith(".json") || name.endsWith(".html") || name.endsWith(".css");
    if (isCode) return <FileCode className="w-5 h-5 text-yellow-455" />;

    if (mime === "application/pdf" || name.endsWith(".pdf")) return <FileText className="w-5 h-5 text-red-400" />;
    return <File className="w-5 h-5 text-slate-350" />;
  };

  const toggleSort = (type: "name" | "size" | "date") => {
    if (sortBy === type) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(type);
      setSortOrder("desc");
    }
  };

  return (
    <div 
      className={`flex-1 flex flex-col justify-between overflow-hidden relative ${isDragOver ? "bg-blue-50/50 border-4 border-dashed border-blue-400" : "bg-slate-50"}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      id="fileexplorer-root"
    >
      
      {/* Upper header section: breadcrumbs and quick search controllers */}
      <div className="p-6 border-b border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4" id="explorer-header-section">
        
        {/* Dynamic Breadcrumbs */}
        <div className="flex items-center flex-wrap gap-1.5 text-sm" id="breadcrumbs-bar">
          {crumbs.map((crumb, index) => (
            <React.Fragment key={crumb.id}>
              {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
              <button 
                onClick={() => setCurrentFolderId(crumb.id)}
                className={`font-semibold hover:text-slate-800 transition-colors cursor-pointer ${crumb.id === currentFolderId ? "text-slate-800" : "text-slate-400"}`}
                id={`crumb-${crumb.id}`}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Search Bar / Action triggers */}
        <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center w-full md:w-auto md:shrink-0" id="explorer-actions-bar">
          
          <div className="relative flex-1 sm:flex-initial" id="search-box-wrap">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 inset-y-0 my-auto" />
            <input 
              type="text"
              placeholder="Search..."
              className="bg-slate-50 text-xs text-slate-800 placeholder-slate-400 px-4 pl-9 py-2 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full sm:w-40 md:w-48 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="search-input"
            />
          </div>

          <button 
            onClick={() => setShowFolderInput(!showFolderInput)}
            className="w-[38px] h-[38px] shrink-0 flex items-center justify-center border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl hover:text-slate-800 hover:shadow-xs transition cursor-pointer"
            title="Create new folder"
            id="create-folder-btn"
          >
            <FolderPlus className="w-4 h-4" />
          </button>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-100 hover:shadow-blue-200/50 transition cursor-pointer shrink-0"
            id="select-upload-btn"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="sm:hidden">Upload</span>
            <span className="hidden sm:inline">Upload File</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            multiple 
            className="hidden" 
            id="file-input-field"
          />

        </div>

      </div>

      {/* Main File System Tree panel body */}
      <div className="flex-1 overflow-y-auto p-6" id="explorer-tree-body">
        
        {/* Dynamic Folder input trigger row */}
        {showFolderInput && (
          <form onSubmit={handleCreateFolder} className="mb-6 max-w-sm animate-fade-in" id="new-folder-form">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Folder title..." 
                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 flex-1"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                autoFocus
                id="new-folder-input"
              />
              <button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 rounded-xl font-bold cursor-pointer"
                id="create-folder-submit"
              >
                Create
              </button>
            </div>
          </form>
        )}

        {/* Sorters Bar */}
        {(displayedFolders.length > 0 || sortedFiles.length > 0) && (
          <div className="flex border-b border-slate-200 pb-3.5 mb-6 text-[10px] text-slate-400 font-mono tracking-wider uppercase font-bold" id="sorters-row">
            <button 
              onClick={() => toggleSort("name")} 
              className="flex items-center gap-1 hover:text-slate-600 transition-colors cursor-pointer"
              id="sort-name-btn"
            >
              <span>Title</span>
              {sortBy === "name" && <ArrowUpDown className="w-3 h-3 text-blue-600" />}
            </button>
            <div className="ml-auto flex gap-6" id="sort-metrics-wrap">
              <button 
                onClick={() => toggleSort("size")} 
                className="flex items-center gap-1 hover:text-slate-600 transition-colors cursor-pointer"
                id="sort-size-btn"
              >
                <span>Size</span>
                {sortBy === "size" && <ArrowUpDown className="w-3 h-3 text-blue-600" />}
              </button>
              <button 
                onClick={() => toggleSort("date")} 
                className="flex items-center gap-1 hover:text-slate-600 transition-colors cursor-pointer mr-6"
                id="sort-date-btn"
              >
                <span>Uploaded</span>
                {sortBy === "date" && <ArrowUpDown className="w-3 h-3 text-blue-600" />}
              </button>
            </div>
          </div>
        )}

        {/* Empty layout display fallback */}
        {displayedFolders.length === 0 && sortedFiles.length === 0 && (
          <div className="h-[250px] flex flex-col justify-center items-center text-center space-y-4" id="empty-collection-display">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 shadow-xs" id="empty-box-frame">
              <Folder className="w-8 h-8 text-blue-500" />
            </div>
            <div className="space-y-1" id="empty-box-speeches">
              <h4 className="text-sm font-semibold text-slate-800">Vault Empty</h4>
              <p className="text-xs text-slate-500 max-w-xs leading-normal">
                Drag and drop files here to upload, or select the Upload button to start saving files.
              </p>
            </div>
          </div>
        )}

        {/* A. Folders Layout */}
        {displayedFolders.length > 0 && (
          <div className="space-y-3 mb-8" id="folders-grid-wrapper">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold">Folders</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" id="folders-grid">
              {displayedFolders.map((folder) => (
                <div 
                  key={folder.id}
                  className="bg-white hover:bg-slate-50/50 border border-slate-200 rounded-xl p-4 flex items-center justify-between group transition cursor-pointer select-none shadow-xs hover:shadow-sm"
                  onClick={() => setCurrentFolderId(folder.id)}
                  id={`folder-card-${folder.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0" id="fold-inner">
                    <Folder className="w-5 h-5 text-amber-500 shrink-0" />
                    <span className="text-xs text-slate-700 font-bold truncate" title={folder.name}>{folder.name}</span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmType("folder");
                      setItemToDeleteId(folder.id);
                      setItemToDeleteName(folder.name);
                    }}
                    className="p-1 px-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                    title="Delete directory"
                    id={`delete-folder-btn-${folder.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* B. Files Layout */}
        {sortedFiles.length > 0 && (
          <div className="space-y-3" id="files-grid-wrapper">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold">Files</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" id="files-grid">
              {sortedFiles.map((file) => (
                <div 
                  key={file.id}
                  onClick={() => onFileClick(file)}
                  className="bg-white hover:bg-slate-50/50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between h-[165px] group transition relative cursor-pointer shadow-sm hover:shadow-md select-none"
                  id={`file-card-${file.id}`}
                >
                  {/* File icon & meta heading */}
                  <div className="space-y-2.5" id="file-inner-header">
                    <div className="flex justify-between items-center" id="icon-line">
                      <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg group-hover:bg-slate-100" id="doc-ico-box">
                        {getFileIcon(file.mimeType, file.name)}
                      </div>
                      
                      {/* Delete Quick Action */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmType("file");
                          setItemToDeleteId(file.id);
                          setItemToDeleteName(file.name);
                        }}
                        className="p-1 px-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="Delete record"
                        id={`delete-file-btn-${file.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1" id="file-title-wrap">
                      <h4 className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors leading-tight pr-4" title={file.name}>
                        {file.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {file.mimeType.split("/")[0]} format
                      </p>
                    </div>
                  </div>

                  {/* Weight metrics */}
                  <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 text-[9px] text-slate-400 font-mono tracking-wide" id="file-inner-footer">
                    <span>{formattedSize(file.size)}</span>
                    <span className="text-[8px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 font-mono" title="TG message context index">
                      MSG #{file.messageId || "N/A"}
                    </span>
                  </div>

                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Floating Upload Progress Monitor (Renders only if active uploads exist) */}
      {activeUploads.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40 max-w-sm w-full bg-white border border-slate-200 rounded-2xl p-4 shadow-xl space-y-3.5 backdrop-blur-md animate-scale-up select-none" id="upload-monitor-tray">
          
          <div className="flex items-center justify-between shadow-xs pb-2 border-b border-slate-100" id="monitor-heading">
            <div className="flex items-center gap-1.5" id="mon-head-text">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              <span className="text-xs font-bold text-slate-800">Active Uploads ({activeUploads.filter(u => u.status === "uploading").length})</span>
            </div>
            <span className="text-[9px] text-slate-400 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-100">Direct Gateway</span>
          </div>

          <div className="max-h-[160px] overflow-y-auto space-y-3 pr-1" id="monitor-upload-list">
            {activeUploads.map((upload) => (
              <div key={upload.id} className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200" id={`upload-row-${upload.id}`}>
                
                <div className="flex items-center justify-between text-[11px]" id="row-titles">
                  <span className="text-slate-800 font-bold truncate max-w-[150px]" title={upload.name}>
                    {upload.name}
                  </span>
                  
                  {upload.status === "uploading" && (
                    <span className="text-blue-600 font-mono font-bold">{upload.progress}%</span>
                  )}
                  {upload.status === "completed" && (
                    <span className="text-emerald-600 font-mono font-semibold flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" /> Ready
                    </span>
                  )}
                  {upload.status === "error" && (
                    <span className="text-rose-600 font-mono font-semibold flex items-center gap-0.5" title={upload.error}>
                      <XCircle className="w-3 h-3" /> Error
                    </span>
                  )}
                </div>

                {upload.status === "uploading" && (
                  <div className="space-y-1" id="row-progress-details">
                    <div className="h-1 bg-slate-200 rounded-full overflow-hidden" id="details-bar-wrap">
                      <div className="h-full bg-blue-600 transition-all rounded-full" style={{ width: `${upload.progress}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400 font-mono" id="details-words">
                      <span>Speed: {upload.speed}</span>
                      <span>ETA: {upload.eta}</span>
                    </div>
                  </div>
                )}

              </div>
            ))}
          </div>

        </div>
      )}

      <ConfirmationDialog
        isOpen={deleteConfirmType !== null}
        title={deleteConfirmType === "folder" ? "Delete Folder Coordinates" : "Delete File Reference"}
        message={
          deleteConfirmType === "folder"
            ? `Are you sure you want to delete the folder "${itemToDeleteName}"? Custom paths and nested items inside are automatically reassigned to its parent namespace.`
            : `Are you sure you want to delete the file "${itemToDeleteName}" from your local drive storage index? (The document itself remains securely archived on your agent's private logs)`
        }
        confirmText="Confirm Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={() => {
          if (itemToDeleteId && deleteConfirmType) {
            if (deleteConfirmType === "folder") {
              onDeleteFolder(itemToDeleteId);
            } else {
              onDeleteFile(itemToDeleteId);
            }
          }
          setDeleteConfirmType(null);
          setItemToDeleteId(null);
          setItemToDeleteName("");
        }}
        onCancel={() => {
          setDeleteConfirmType(null);
          setItemToDeleteId(null);
          setItemToDeleteName("");
        }}
      />

    </div>
  );
}
