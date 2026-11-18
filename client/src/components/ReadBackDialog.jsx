import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle } from 'lucide-react';

export default function ReadBackDialog({ text, onConfirm, onRetry }) {
  const { t } = useTranslation();
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 w-full">
      <p className="text-sm text-gray-500 mb-1">{t('i_heard')}</p>
      <p className="text-xl font-semibold text-gray-800 mb-4">"{text}"</p>
      <div className="flex gap-3">
        <button onClick={onConfirm}
          className="flex-1 flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 text-white py-3 rounded-xl font-semibold touch-target">
          <CheckCircle size={20} /> {t('yes')}
        </button>
        <button onClick={onRetry}
          className="flex-1 flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-xl font-semibold touch-target">
          <XCircle size={20} /> {t('no')}
        </button>
      </div>
    </div>
  );
}
