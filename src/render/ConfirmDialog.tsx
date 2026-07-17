// 通用确认/预览对话框
import { theme } from './theme';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  children,
  confirmLabel = '确认',
  cancelLabel = '取消',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: theme.colors.bgOverlay + 'b3',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1100,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: theme.colors.bg,
          borderRadius: theme.borderRadius,
          border: `1px solid ${theme.colors.border}`,
          padding: 16,
          maxWidth: 360,
          width: '90%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 12px', color: danger ? theme.colors.danger : theme.colors.accent, fontSize: 16 }}>
          {title}
        </h3>
        <div style={{ fontSize: 13, color: theme.colors.text, lineHeight: 1.5, marginBottom: 16 }}>
          {children}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              padding: '6px 14px',
              background: theme.colors.disabled,
              border: 'none',
              color: '#fff',
              borderRadius: theme.borderRadius,
              cursor: 'pointer',
              fontFamily: theme.fontFamily,
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '6px 14px',
              background: danger ? theme.colors.danger : theme.colors.primary,
              border: 'none',
              color: '#fff',
              borderRadius: theme.borderRadius,
              cursor: 'pointer',
              fontFamily: theme.fontFamily,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
