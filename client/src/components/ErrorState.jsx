import { AlertCircle } from 'lucide-react';

export default function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <AlertCircle size={48} className="text-red-400" />
      <p className="text-gray-600">{message || 'Something went wrong'}</p>
      {onRetry && (
        <button onClick={onRetry} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Retry
        </button>
      )}
    </div>
  );
}
