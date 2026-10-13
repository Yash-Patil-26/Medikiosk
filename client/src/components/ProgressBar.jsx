const STEPS = ['Identify', 'Consent', 'Complaint', 'Interview', 'Documents', 'Review', 'Done'];

export default function ProgressBar({ current }) {
  const idx = STEPS.indexOf(current);
  return (
    <div className="w-full px-4 py-2">
      <div className="flex items-center justify-between mb-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-col items-center flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
              ${i < idx ? 'bg-teal-500 text-white' : i === idx ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {i < idx ? '✓' : i + 1}
            </div>
            <span className="text-xs mt-1 hidden sm:block text-gray-500">{s}</span>
          </div>
        ))}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${((idx) / (STEPS.length - 1)) * 100}%` }} />
      </div>
    </div>
  );
}
