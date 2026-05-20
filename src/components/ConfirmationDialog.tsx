import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  type = "danger",
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="confirm-modal-portal">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            id="confirm-modal-backdrop"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden relative z-10 p-6 space-y-5"
            id="confirm-modal-container"
          >
            {/* Close Icon button */}
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition"
              id="confirm-modal-close-btn"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header / Icon */}
            <div className="flex gap-4" id="confirm-modal-header">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  type === "danger"
                    ? "bg-rose-50 text-rose-600 border border-rose-100"
                    : "bg-amber-50 text-amber-600 border border-amber-100"
                }`}
                id="confirm-modal-icon-box"
              >
                {type === "danger" ? <Trash2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div className="space-y-1.5" id="confirm-modal-text-group">
                <h3 className="text-sm font-bold text-slate-800 leading-tight">
                  {title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {message}
                </p>
              </div>
            </div>

            {/* Actions button strip */}
            <div className="flex gap-3 justify-end pt-2" id="confirm-modal-actions">
              <button
                onClick={onCancel}
                className="bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer"
                id="confirm-modal-btn-cancel"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`font-semibold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer text-white shadow-sm ${
                  type === "danger"
                    ? "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-rose-100 hover:shadow-rose-200/50"
                    : "bg-amber-600 hover:bg-amber-700 active:bg-amber-800 shadow-amber-100 hover:shadow-amber-200/50"
                }`}
                id="confirm-modal-btn-confirm"
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
