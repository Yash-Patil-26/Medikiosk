const STEPS = ['Identify', 'Consent', 'Complaint', 'Interview', 'Documents', 'Review', 'Done'];

export default function ProgressBar({ current }) {
  const idx = STEPS.indexOf(current);
  return (
    <div className="w-full px-6 py-4 bg-white/50 backdrop-blur-sm border-b border-gray-200/50">
      <div className="flex items-center justify-between mb-3">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-col items-center flex-1 relative">
            {i < STEPS.length - 1 && (
              <div className={`absolute top-3 left-1/2 w-full h-0.5 -translate-y-1/2 -z-10 ${i < idx ? 'bg-primary-500' : 'bg-gray-200'}`} />
            )}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shadow-sm
              ${i < idx ? 'bg-gradient-to-br from-success-500 to-success-600 text-white shadow-success-200' : i === idx ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-primary-200 ring-4 ring-primary-100' : 'bg-gray-100 text-gray-400'}`}>
              {i < idx ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : i + 1}
            </div>
            <span className={`text-xs mt-2 font-medium hidden sm:block transition-colors ${i <= idx ? 'text-gray-700' : 'text-gray-400'}`}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
