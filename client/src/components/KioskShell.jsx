import { useNavigate } from 'react-router-dom';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, HelpCircle, Activity, HeartPulse, Moon, Sun, Type, X } from 'lucide-react';
import ProgressBar from './ProgressBar.jsx';
import AccessibilityControls from './AccessibilityControls.jsx';
import { useKiosk } from '../context/KioskContext.jsx';
import { useIdleTimer } from '../hooks/useIdleTimer.js';
import { useTheme } from '../context/ThemeContext.jsx';
import api from '../services/api.js';

export default function KioskShell({ children, step, showBack = true, backTo }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { kiosk, reset } = useKiosk();
  const { darkMode, toggleDarkMode } = useTheme();

  const [idlePurgeStatus, setIdlePurgeStatus] = useState(null);
  const idlePurgeInFlight = useRef(false);
  const [showHomeWarning, setShowHomeWarning] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

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

  const handleLogoClick = () => {
    if (kiosk.sessionId) {
      setShowHomeWarning(true);
    } else {
      navigate('/');
    }
  };

  const confirmHomeNavigation = () => {
    setShowHomeWarning(false);
    if (kiosk.sessionId) {
      handleIdle();
    } else {
      navigate('/');
    }
  };

  const cancelHomeNavigation = () => {
    setShowHomeWarning(false);
  };

  return (
    <div className={`min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-primary-50/30 ${kiosk.highContrast ? 'bg-gray-950 text-white' : ''} ${kiosk.largeText ? 'text-lg' : ''}`}>
      {(warning || idlePurgeStatus !== null) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-scale-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
              <HeartPulse size={32} className="text-amber-600 animate-pulse-soft" />
            </div>
            <p className="text-xl font-bold text-gray-800 mb-2">{idlePurgeStatus === 'failed' ? t('idle_purge_failed') : idlePurgeStatus === 'purging' ? t('idle_purge_pending') : t('idle_warning')}</p>
            <p className="text-gray-500 mb-6">{idlePurgeStatus === 'failed' ? t('purge_error') : idlePurgeStatus === 'purging' ? t('purge_pending') : t('session_reset_warning')}</p>
            <button
              onClick={() => {
                if (idlePurgeStatus === 'failed') {
                  void handleIdle();
                }
              }}
              disabled={idlePurgeStatus === 'purging'}
              className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3 rounded-xl font-bold hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 shadow-lg transition-all">
              {idlePurgeStatus === 'failed'
                ? t('purge_retry')
                : idlePurgeStatus === 'purging'
                  ? t('purge_pending')
                  : t('still_here')}
            </button>
          </div>
        </div>
      )}

      <header className={`bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm px-6 py-4 flex items-center justify-between sticky top-0 z-40 ${darkMode ? 'dark:bg-gray-800 dark:border-gray-700' : ''}`}>
        <div className="flex items-center gap-4">
          {showBack && (
            <button onClick={() => backTo ? navigate(backTo) : navigate(-1)}
              className="p-2.5 rounded-xl hover:bg-gray-100 transition-colors touch-target group" aria-label="Back">
              <ArrowLeft size={22} className="text-gray-600 group-hover:text-primary-600 transition-colors" />
            </button>
          )}
          <button onClick={handleLogoClick} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md">
              <Activity size={20} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-gray-800 text-lg leading-tight">MediKiosk</span>
              <span className="text-xs text-gray-500 font-medium">Clinical Intake System</span>
            </div>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleDarkMode}
            className="p-2.5 rounded-xl hover:bg-gray-100 transition-colors touch-target group" 
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun size={22} className="text-gray-600 group-hover:text-primary-600 transition-colors" /> : <Moon size={22} className="text-gray-600 group-hover:text-primary-600 transition-colors" />}
          </button>
          <AccessibilityControls />
          <button 
            onClick={() => setShowHelpModal(true)}
            className="p-2.5 rounded-xl hover:bg-gray-100 transition-colors touch-target group" 
            aria-label="Help"
          >
            <HelpCircle size={22} className="text-gray-400 group-hover:text-primary-600 transition-colors" />
          </button>
        </div>
      </header>

      {step && <ProgressBar current={step} />}

      <main className="flex-1 flex flex-col items-center justify-start p-6 max-w-2xl mx-auto w-full animate-fade-in">
        {children}
      </main>

      <footer className="text-center text-xs text-gray-400 py-4 px-6 border-t border-gray-200/50 bg-white/50 backdrop-blur-sm">
        <p>{t('footer_disclaimer')}</p>
      </footer>

      {showHomeWarning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-scale-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warning-100 flex items-center justify-center">
              <Activity size={32} className="text-warning-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3 text-center">{t('session_warning_title')}</h3>
            <p className="text-gray-600 mb-6 text-center leading-relaxed">{t('session_warning_message')}</p>
            <div className="flex gap-3">
              <button
                onClick={cancelHomeNavigation}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={confirmHomeNavigation}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-warning-500 to-warning-600 text-white rounded-xl font-semibold hover:from-warning-600 hover:to-warning-700 transition-all"
              >
                {t('exit_session')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showHelpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">{t('help_title')}</h3>
              <button onClick={() => setShowHelpModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={24} className="text-gray-500" />
              </button>
            </div>
            <div className="space-y-4 text-gray-600">
              <p>{t('help_introduction')}</p>
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-800 mb-2">{t('help_steps_title')}</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>{t('help_step_1')}</li>
                  <li>{t('help_step_2')}</li>
                  <li>{t('help_step_3')}</li>
                  <li>{t('help_step_4')}</li>
                  <li>{t('help_step_5')}</li>
                  <li>{t('help_step_6')}</li>
                  <li>{t('help_step_7')}</li>
                </ol>
              </div>
              <p className="text-sm">{t('help_contact')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
