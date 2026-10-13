import { useEffect, useState } from 'react';

export default function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = { info: 'bg-blue-600', success: 'bg-teal-600', error: 'bg-red-600', warning: 'bg-amber-500' };
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl text-white shadow-lg ${colors[type]} flex items-center gap-3`}>
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 text-white/80 hover:text-white">✕</button>
    </div>
  );
}
