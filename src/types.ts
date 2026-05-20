/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DriveFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  telegramFileId: string;
  uploadedAt: string;
  parentId: string; // "root" or a folder's id
  messageId?: number; // message_id inside Telegram chat
}

export interface DriveFolder {
  id: string;
  name: string;
  parentId: string; // "root" or a folder's id
  createdAt: string;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  botName?: string;
  botUsername?: string;
  verified: boolean;
}

export interface ActiveUpload {
  id: string;
  name: string;
  size: number;
  progress: number; // 0 to 100
  speed: string; // e.g., "1.2 MB/s"
  eta: string; // e.g., "5s"
  status: "uploading" | "completed" | "error";
  error?: string;
}

export interface SharedFilePayload {
  token: string;
  fileId: string;
  name: string;
  size: number;
  mime: string;
}
