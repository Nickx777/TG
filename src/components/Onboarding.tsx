/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  validateBotToken, 
  discoverChatId, 
  sendVerificationMessage, 
  restoreMetadataFromTelegram 
} from "../lib/telegram";
import { TelegramConfig, DriveFile, DriveFolder } from "../types";
import { 
  KeyRound, 
  Bot, 
  Send, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  RefreshCw, 
  FolderLock, 
  Cloud 
} from "lucide-react";

interface OnboardingProps {
  onComplete: (config: TelegramConfig, restoredData?: { files: DriveFile[]; folders: DriveFolder[] } | null) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [token, setToken] = useState("");
  const [chatId, setChatId] = useState("");
  
  const [validatingToken, setValidatingToken] = useState(false);
  const [botInfo, setBotInfo] = useState<{ name: string; username: string } | null>(null);
  const [tokenError, setTokenError] = useState("");

  const [detectingId, setDetectingId] = useState(false);
  const [detectedSuccess, setDetectedSuccess] = useState<string | null>(null);
  const [idError, setIdError] = useState("");

  const [restoring, setRestoring] = useState(false);
  const [restoredCount, setRestoredCount] = useState<{ files: number; folders: number } | null>(null);
  const [restoredState, setRestoredState] = useState<{ files: DriveFile[]; folders: DriveFolder[] } | null>(null);

  const [step, setStep] = useState<1 | 2>(1);

  const handleValidateToken = async () => {
    if (!token.trim()) {
      setTokenError("Please input a valid Bot Token");
      return;
    }
    setTokenError("");
    setValidatingToken(true);
    setBotInfo(null);
    try {
      const info = await validateBotToken(token);
      setBotInfo(info);
      setTokenError("");
      // Transition to step 2 automatically after 1 second for seamless feel
      setTimeout(() => {
        setStep(2);
      }, 800);
    } catch (err: any) {
      setTokenError(err.message || "Failed to validate token. Check spelling and network.");
    } finally {
      setValidatingToken(false);
    }
  };

  const handleDetectChatId = async () => {
    if (!token.trim()) {
      setIdError("Bot Token is required for detection");
      return;
    }
    setIdError("");
    setDetectingId(true);
    setDetectedSuccess(null);
    try {
      // Prompt user to write first
      const discovered = await discoverChatId(token);
      if (discovered) {
        setChatId(discovered.chatId);
        setDetectedSuccess(`Connected to: "${discovered.senderName}" (${discovered.chatId})`);
      } else {
        setIdError("No recent updates found. Send a message/command *first* to your bot inside the channel, then try again.");
      }
    } catch {
      setIdError("Failed to polling updates. Make sure bot token is active.");
    } finally {
      setDetectingId(false);
    }
  };

  const handleTryRestore = async () => {
    if (!token.trim() || !chatId.trim()) {
      setIdError("Token and Chat ID are both needed to scan backups");
      return;
    }
    setIdError("");
    setRestoring(true);
    setRestoredCount(null);
    setRestoredState(null);
    try {
      const data = await restoreMetadataFromTelegram(token, chatId);
      if (data) {
        setRestoredCount({ files: data.files.length, folders: data.folders.length });
        setRestoredState(data);
      } else {
        setIdError("No pinned directory backup (tg_drive_metadata.json) found in this Chat's pinned messages.");
      }
    } catch {
      setIdError("Failure reading chat pinned parameters. Access denied.");
    } finally {
      setRestoring(false);
    }
  };

  const handleFinishOnboarding = async () => {
    if (!token.trim() || !chatId.trim()) {
      setIdError("Please complete setup credentials.");
      return;
    }

    // Try sending automated verification line
    if (botInfo) {
      await sendVerificationMessage(token, chatId, botInfo.username);
    }

    onComplete({
      botToken: token.trim(),
      chatId: chatId.trim(),
      botName: botInfo?.name || "Active Bot",
      botUsername: botInfo?.username || "bot",
      verified: true
    }, restoredState);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12" id="onboarding-root">
      
      {/* Visual Header */}
      <div className="text-center mb-8 max-w-md" id="onboarding-header">
        <div className="inline-flex items-center justify-center p-3.5 bg-white border border-slate-200 rounded-2xl mb-4 text-blue-600 shadow-md shadow-slate-100" id="onboarding-icon-container">
          <Cloud className="w-10 h-10 animate-pulse text-blue-600" id="onboarding-cloud-icon" />
        </div>
        <h1 className="text-4xl font-display font-bold tracking-tight text-slate-800 mb-2" id="onboarding-title">ZDrive</h1>
        <p className="text-sm text-slate-500 font-sans" id="onboarding-subtitle">
          Enjoy unlimited, secure, fully self-hosted cloud storage backing up directly into your own private ZDrive cloud vaults.
        </p>
      </div>

      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xl" id="onboarding-card">
        {/* Step Indicator Tabs */}
        <div className="flex border-b border-slate-200 pb-4 mb-6" id="onboarding-tabs">
          <button 
            className={`flex-1 text-center py-2 text-sm font-semibold transition-colors border-b-2 -mb-[18px] ${step === 1 ? "text-blue-600 border-blue-600" : "text-slate-400 border-transparent hover:text-slate-600"}`}
            onClick={() => setStep(1)}
            id="onboarding-tab-1"
          >
            1. Connect Server Key
          </button>
          <button 
            className={`flex-1 text-center py-2 text-sm font-semibold transition-colors border-b-2 -mb-[18px] ${step === 2 ? "text-blue-600 border-blue-600" : "text-slate-400 border-transparent hover:text-slate-600"}`}
            onClick={() => { if (botInfo) setStep(2); }}
            disabled={!botInfo}
            id="onboarding-tab-2"
          >
            2. Link Vault Destination
          </button>
        </div>

        {/* STEP 1: Connect Token */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in" id="onboarding-step-1">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500 space-y-2 leading-relaxed" id="botfather-guide">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 mb-1 text-sm">
                <Bot className="w-4 h-4 text-blue-600" /> Connecting your ZDrive Agent
              </span>
              <p>1. Open your drive space manager or retrieve access details from your Node Administrator.</p>
              <p>2. Generate an Access Token and Vault ID credentials for your secure storage vault.</p>
              <p>3. Copy the secure HTTP API **Access Key** and paste it directly below:</p>
            </div>

            <div className="space-y-2" id="token-input-container">
              <label className="text-xs font-bold text-slate-400 tracking-wider uppercase block">Access Key (ZDrive API Token)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <KeyRound className="w-5 h-5" />
                </span>
                <input 
                  type="password"
                  placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-sm leading-relaxed"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  id="token-input"
                />
              </div>
              {tokenError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 mt-1" id="token-error">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span className="text-rose-600 font-semibold">{tokenError}</span>
                </div>
              )}
            </div>

            {botInfo ? (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl p-4 flex items-center gap-3" id="bot-success-card">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold">{botInfo.name}</p>
                  <p className="text-xs text-emerald-600 font-medium">@{botInfo.username} linked successfully</p>
                </div>
              </div>
            ) : null}

            <button 
              onClick={handleValidateToken}
              disabled={validatingToken}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3.5 px-4 rounded-xl items-center justify-center flex gap-2 transition-all cursor-pointer shadow-lg shadow-blue-100 hover:shadow-blue-200/50"
              id="validate-token-btn"
            >
              {validatingToken ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin text-whiteCode" />
                  <span>Verifying server handshake...</span>
                </>
              ) : (
                <>
                  <span>Next: Link Vault Destination</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* STEP 2: Link Chat Vault */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-in" id="onboarding-step-2">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500 space-y-2 leading-relaxed animate-fade-in" id="chat-guide">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 mb-1 text-sm">
                <FolderLock className="w-4 h-4 text-blue-600" /> Connecting Secure Vault Namespace
              </span>
              <p>All files are encrypted and synced directly to your private ZDrive cloud nodes.</p>
              <p>1. Open your drive space manager and create a private **ZDrive Vault Space**.</p>
              <p>2. Complete the node binding registry with security credentials.</p>
              <p>3. Send an initial handshake ping to the vault namespace, then click **Auto-Detect** below, or enter your Vault ID manually.</p>
            </div>

            <div className="space-y-4" id="chat-id-container">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 tracking-wider uppercase block">Vault ID / Space ID</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <Send className="w-4 h-4" />
                    </span>
                    <input 
                      type="text"
                      placeholder="e.g. -1001987654321 or Vault Namespace"
                      className="w-full bg-white border border-slate-205 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm shadow-xs"
                      value={chatId}
                      onChange={(e) => setChatId(e.target.value)}
                      id="chat-id-input"
                    />
                  </div>
                  
                  <button
                    onClick={handleDetectChatId}
                    disabled={detectingId}
                    className="bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-200 text-xs font-semibold px-4 rounded-xl flex items-center gap-1.5 transition-all text-slate-705 cursor-pointer shrink-0 disabled:opacity-40"
                    title="Poll active server nodes to fetch Space ID"
                    id="detect-chat-id-btn"
                  >
                    {detectingId ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Auto-Detect"
                    )}
                  </button>
                </div>
              </div>

              {detectedSuccess && (
                <div className="text-xs text-emerald-600 flex items-center gap-1 font-semibold" id="detect-success">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{detectedSuccess}</span>
                </div>
              )}

              {idError && (
                <div className="flex items-start gap-1.5 text-xs text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-lg" id="id-error">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span className="text-rose-600 font-medium leading-normal">{idError}</span>
                </div>
              )}
            </div>

            {/* Optional Pinned Restore trigger */}
            <div className="border-t border-slate-150 pt-4" id="restore-trigger-container">
              <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-4 rounded-xl" id="restore-banner">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Reinstalling on a new device?</h4>
                  <p className="text-[10px] text-slate-400">Scan backups on your secure vault key store.</p>
                </div>
                <button
                  onClick={handleTryRestore}
                  disabled={restoring || !chatId}
                  className="bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 text-[11px] font-bold text-blue-600 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-xs disabled:opacity-30 disabled:cursor-not-allowed"
                  id="restore-scan-btn"
                >
                  {restoring ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <Download className="w-3 h-3" />
                      Restore Index
                    </>
                  )}
                </button>
              </div>

              {restoredCount && (
                <div className="mt-2 text-xs text-amber-700 font-medium flex items-center gap-1 bg-amber-50 border border-amber-100 p-2.5 rounded-lg" id="restore-success-alert">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Restored **{restoredCount.folders} folders** and **{restoredCount.files} files** from pinned backup successfully. Ready to load!</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2" id="onboarding-final-actions">
              <button 
                onClick={() => setStep(1)}
                className="w-24 border border-slate-200 hover:bg-slate-50 text-slate-500 py-3 rounded-xl font-bold transition-all text-sm cursor-pointer shadow-xs"
                id="back-to-step-1"
              >
                Back
              </button>
              <button 
                onClick={handleFinishOnboarding}
                disabled={!chatId.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-blue-100 hover:shadow-blue-200/50"
                id="activate-drive-btn"
              >
                <span>Activate Drive Node</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
