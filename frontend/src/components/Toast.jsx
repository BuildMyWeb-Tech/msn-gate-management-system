import React, { useEffect } from "react";
import { CheckCircle, AlertCircle, X } from "lucide-react";

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;
  return (
    <div className={`toast ${toast.type}`}>
      <span className="toast-icon">
        {toast.type === "success"
          ? <CheckCircle size={18} />
          : <AlertCircle size={18} />}
      </span>
      <span style={{ flex: 1 }}>{toast.msg}</span>
      <button className="toast-close" onClick={onClose}><X size={14} /></button>
    </div>
  );
}
