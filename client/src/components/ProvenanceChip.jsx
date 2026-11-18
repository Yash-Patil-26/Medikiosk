import { CheckCircle, AlertCircle } from 'lucide-react';

export default function ProvenanceChip({ source, confirmedBy }) {
  const confirmed = !!confirmedBy;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium
      ${confirmed ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'}`}>
      {confirmed ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
      {confirmed ? 'Patient confirmed' : 'Unconfirmed'} · {source}
    </span>
  );
}
