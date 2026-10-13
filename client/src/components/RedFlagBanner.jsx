import { AlertTriangle, AlertOctagon } from 'lucide-react';

export default function RedFlagBanner({ level, reasons = [] }) {
  if (!level || level === 'none') return null;
  const isCritical = level === 'critical';
  return (
    <div className={`rounded-xl p-4 flex gap-3 items-start ${isCritical ? 'bg-red-50 border border-red-300' : 'bg-amber-50 border border-amber-300'}`}>
      {isCritical ? <AlertOctagon className="text-red-600 mt-0.5 shrink-0" size={22} /> : <AlertTriangle className="text-amber-600 mt-0.5 shrink-0" size={22} />}
      <div>
        <p className={`font-bold ${isCritical ? 'text-red-700' : 'text-amber-700'}`}>
          {isCritical ? 'Critical Alert' : 'Warning Alert'}
        </p>
        {reasons.map((r, i) => <p key={i} className="text-sm text-gray-700">{r}</p>)}
      </div>
    </div>
  );
}
