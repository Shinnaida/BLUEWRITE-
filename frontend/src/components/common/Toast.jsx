import React, { useEffect } from 'react';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

const icons = { success: CheckCircle2, info: Info, warning: TriangleAlert, error: TriangleAlert };
const colors = {
  success: 'border-green-200 bg-green-50 text-green-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  error: 'border-red-200 bg-red-50 text-red-800',
};

function Toast({ message, type = 'info', onClose, duration = 3200 }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;
  const Icon = icons[type] || Info;
  return (
    <div className={`fixed right-4 top-4 z-[70] flex max-w-sm items-start gap-3 rounded-lg border px-4 py-3 text-sm font-semibold shadow-lg ${colors[type] || colors.info}`} role="status">
      <Icon size={18} className="mt-0.5 shrink-0" />
      <span className="flex-1">{message}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss notification"><X size={16} /></button>
    </div>
  );
}

export default Toast;