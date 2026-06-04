import { useEffect } from "react";

interface ShortcutHandlers {
  onPlayPause?: () => void;      // Space
  onStartRecord?: () => void;    // R
  onStopRecord?: () => void;     // R (when recording)
  onClose?: () => void;          // Escape
  isRecording?: boolean;
  isModalOpen?: boolean;
}

export function useKeyboardShortcuts({
  onPlayPause,
  onStartRecord,
  onStopRecord,
  onClose,
  isRecording,
  isModalOpen,
}: ShortcutHandlers) {
  useEffect(() => {
    if (!isModalOpen) return;

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      // Don't fire when typing in input/textarea
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.code === "Space") {
        e.preventDefault();
        onPlayPause?.();
      }
      if (e.code === "KeyR" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        if (isRecording) {
          onStopRecord?.();
        } else {
          onStartRecord?.();
        }
      }
      if (e.code === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isModalOpen, isRecording, onPlayPause, onStartRecord, onStopRecord, onClose]);
}
