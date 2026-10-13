import { useTranslation } from 'react-i18next';
import { useKiosk } from '../context/KioskContext.jsx';

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'mr', label: 'मराठी' }
];

export default function LanguageSelector() {
  const { kiosk, update } = useKiosk();
  const { i18n } = useTranslation();

  const change = (code) => {
    i18n.changeLanguage(code);
    update({ language: code });
  };

  return (
    <div className="flex gap-1">
      {LANGS.map(l => (
        <button key={l.code}
          onClick={() => change(l.code)}
          className={`px-2 py-1 rounded text-sm font-medium border transition
            ${kiosk.language === l.code
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
          {l.label}
        </button>
      ))}
    </div>
  );
}
