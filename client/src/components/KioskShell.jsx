import { useNavigate } from 'react-router-dom';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, HelpCircle, Activity } from 'lucide-react';
import DemoBanner from './DemoBanner.jsx';
import ProgressBar from './ProgressBar.jsx';
import LanguageSelector from './LanguageSelector.jsx';
import AccessibilityControls from './AccessibilityControls.jsx';
import { useKiosk } from '../context/KioskContext.jsx';
import { useIdleTimer } from '../hooks/useIdleTimer.js';
import api from '../services/api.js';

export default function KioskShell({ children, step, showBack = true, backTo }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { kiosk, reset } = useKiosk();

  const [idlePurgeStatus, setIdlePurgeStatus] = useState(null);
  const idlePurgeInFlight = useRef(false);

  const handleIdle = async () => {
    if (idlePurgeInFlight.current) return;

    const sessionId = kiosk.sessionId;

    if (!sessionId) {
      reset();
      navigate('/');
      return;
    }

    idlePurgeInFlight.current = true;
    setIdlePurgeStatus('purging');

    try {
      const response = await api.delete(`/sessions/${sessionId}`);

      const purgeResult = response.data;

      if (
        purgeResult?.purged !== true ||
        !Array.isArray(purgeResult.items) ||
        !Array.isArray(purgeResult.retained)
      ) {
        throw new Error('Server did not confirm session purge');
      }

      // Only clear local state after server-side purge is confirmed.
      reset();
      navigate('/');
    } catch (error) {
      console.error('Idle session purge was not confirmed:', error);
      // Keep the session ID so the user can retry.
      setIdlePurgeStatus('failed');
    } finally {
      idlePurgeInFlight.current = false;
    }
  };

  const { warning } = useIdleTimer(90000, handleIdle);

  return (
    <div className={`min-h-screen flex flex-col ${kiosk.highContrast ? 'bg-gray-950 text-white' : 'bg-gray-50'} ${kiosk.largeText ? 'text-lg' : ''}`}>
      <DemoBanner />

      {(warning || idlePurgeStatus !== null) && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
            <p className="text-xl font-bold text-gray-800 mb-2">{idlePurgeStatus === 'failed' ? t('idle_purge_failed') : idlePurgeStatus === 'purging' ? t('idle_purge_pending') : t('idle_warning')}</p>
            <p className="text-gray-500 mb-6">{idlePurgeStatus === 'failed' ? t('purge_error') : idlePurgeStatus === 'purging' ? t('purge_pending') : t('session_reset_warning')}</p>
            <button
              onClick={() => {
                if (idlePurgeStatus === 'failed') {
                  void handleIdle();
                }
              }}
              disabled={idlePurgeStatus === 'purging'}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">
              {idlePurgeStatus === 'failed'
                ? t('purge_retry')
                : idlePurgeStatus === 'purging'
                  ? t('purge_pending')
                  : t('still_here')}
            </button>
          </div>
        </div>
      )}

      <header className="bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <button onClick={() => backTo ? navigate(backTo) : navigate(-1)}
              className="p-2 rounded-lg hover:bg-gray-100 touch-target" aria-label="Back">
              <ArrowLeft size={22} />
            </button>
          )}
          <div className="flex items-center gap-2">
            <Activity size={24} className="text-blue-600" />
            <span className="font-bold text-blue-700 text-lg">MediKiosk</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSelector />
          <AccessibilityControls />
          <button className="p-2 rounded-lg hover:bg-gray-100 touch-target" aria-label="Help">
            <HelpCircle size={22} className="text-gray-500" />
          </button>
        </div>
      </header>

      {step && <ProgressBar current={step} />}

      <main className="flex-1 flex flex-col items-center justify-start p-4 max-w-2xl mx-auto w-full">
        {children}
      </main>

      <footer className="text-center text-xs text-gray-400 py-3 px-4">
        {t('footer_disclaimer')}
      </footer>
    </div>
  );
}
