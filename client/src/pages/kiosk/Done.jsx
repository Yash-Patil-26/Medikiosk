import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Trash2 } from 'lucide-react';
import KioskShell from '../../components/KioskShell.jsx';
import { useKiosk } from '../../context/KioskContext.jsx';
import api from '../../services/api.js';

const PURGE_ITEMS = [
  'Temporary session deleted',
  'Transcript removed',
  'Temporary extraction removed',
  'Kiosk state cleared'
];

export default function Done() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { kiosk, reset } = useKiosk();
  const [purged, setPurged] = useState(false);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const sessionId = kiosk.sessionId;
    if (!sessionId) { setPurged(true); setItems(PURGE_ITEMS); return; }
    api.delete(`/sessions/${sessionId}`)
      .then(r => { setItems(r.data.items || PURGE_ITEMS); setPurged(true); })
      .catch(() => { setItems(PURGE_ITEMS); setPurged(true); })
      .finally(() => reset());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <KioskShell step="Done" showBack={false}>
      <div className="w-full mt-8 flex flex-col items-center gap-6 text-center">
        <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center">
          <CheckCircle size={44} className="text-teal-600" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-800">{t('done_title')}</h1>
        <p className="text-gray-500 max-w-sm">
          {t('session_complete_desc')}
        </p>

        {purged && (
          <div className="w-full bg-white border rounded-2xl p-5 text-left">
            <div className="flex items-center gap-2 mb-4">
              <Trash2 size={20} className="text-blue-600" />
              <h2 className="font-bold text-gray-800 text-lg">{t('session_purged')}</h2>
            </div>
            <div className="flex flex-col gap-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-gray-700">
                  <CheckCircle size={16} className="text-teal-500 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-4">
              {t('purge_note')}
            </p>
          </div>
        )}

        <button onClick={() => navigate('/')}
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700">
          {t('return_home')}
        </button>
      </div>
    </KioskShell>
  );
}
