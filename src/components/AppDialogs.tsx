import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X, HelpCircle } from 'lucide-react';

export interface ToastMessage {
  id: string;
  text: string;
  type?: 'success' | 'error' | 'info' | 'warning';
}

export const ToastBanner: React.FC<{
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[90] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] pointer-events-none no-print">
      {toasts.map((t) => {
        const bgClass =
          t.type === 'error'
            ? 'bg-red-600 text-white border-red-700'
            : t.type === 'warning'
            ? 'bg-amber-500 text-slate-950 border-amber-600'
            : t.type === 'info'
            ? 'bg-slate-900 text-white border-slate-700 dark:bg-slate-800'
            : 'bg-emerald-600 text-white border-emerald-700';

        const Icon =
          t.type === 'error' || t.type === 'warning'
            ? AlertTriangle
            : t.type === 'info'
            ? Info
            : CheckCircle2;

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2.5 p-3.5 rounded-xl border shadow-xl text-xs font-semibold animate-fade-in ${bgClass}`}
          >
            <Icon className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1 whitespace-pre-line leading-relaxed">{t.text}</span>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="p-0.5 rounded hover:bg-black/15 cursor-pointer shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

export const ConfirmDialogModal: React.FC<{
  dialog: ConfirmDialogState | null;
  onClose: () => void;
}> = ({ dialog, onClose }) => {
  if (!dialog) return null;

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              dialog.danger
                ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
            }`}
          >
            {dialog.danger ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <HelpCircle className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              {dialog.title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-line leading-relaxed">
              {dialog.message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
          >
            {dialog.cancelLabel || 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => {
              dialog.onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-xs font-black rounded-xl cursor-pointer shadow-xs ${
              dialog.danger
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950'
            }`}
          >
            {dialog.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export interface InputPromptState {
  title: string;
  label: string;
  initialValue?: string;
  inputType?: 'text' | 'number';
  placeholder?: string;
  submitLabel?: string;
  onSubmit: (value: string) => void;
}

export const InputPromptModal: React.FC<{
  promptState: InputPromptState | null;
  onClose: () => void;
}> = ({ promptState, onClose }) => {
  const [val, setVal] = useState(promptState?.initialValue || '');

  useEffect(() => {
    setVal(promptState?.initialValue || '');
  }, [promptState]);

  if (!promptState) return null;

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          promptState.onSubmit(val);
          onClose();
        }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 dark:text-white">
            {promptState.title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 whitespace-pre-line">
            {promptState.label}
          </label>
          <input
            type={promptState.inputType || 'text'}
            autoFocus
            required
            placeholder={promptState.placeholder}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-black text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl cursor-pointer shadow-xs"
          >
            {promptState.submitLabel || 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};
