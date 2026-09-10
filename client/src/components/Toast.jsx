import React, { useEffect } from 'react';

export default function Toast({ toast, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4200);
    return () => clearTimeout(t);
  }, [toast.id, onDone]);

  return (
    <div className={`toast toast--${toast.type}`} role="status">
      {toast.message}
    </div>
  );
}
