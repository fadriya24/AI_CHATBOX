import React, { useEffect } from 'react';
import { Trash2 } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Clear Chat',
  onCancel,
  onConfirm
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = e => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-icon-badge" aria-hidden="true">
            <Trash2 size={20} />
          </span>
          <h3 id="confirm-modal-title" className="modal-title">
            {title}
          </h3>
        </div>
        <p className="modal-description">{message}</p>
        <div className="modal-actions">
          <button type="button" className="modal-btn cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="modal-btn confirm" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
