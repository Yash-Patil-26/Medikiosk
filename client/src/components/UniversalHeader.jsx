import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Moon, Sun, Type, HelpCircle, X, LogOut, Stethoscope } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useKiosk } from '../context/KioskContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import api from '../services/api.js';
import i18n from '../i18n/i18n.js';

export default function UniversalHeader({ showLogout = false, showLanguageSelector = false }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { kiosk, reset } = useKiosk();
  const { darkMode, toggleDarkMode } = useTheme();
  const [showHomeWarning, setShowHomeWarning] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showTextSizeModal, setShowTextSizeModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogoClick = () => {
    // Only show warning if there's an active kiosk session
    if (kiosk.sessionId) {
      setShowHomeWarning(true);
    } else {
      // Normal navigation for non-kiosk pages
      navigate('/');
    }
  };

  const confirmHomeNavigation = async () => {
    setShowHomeWarning(false);
    if (kiosk.sessionId) {
      try {
        await api.delete(`/sessions/${kiosk.sessionId}`);
        reset();
        navigate('/');
      } catch (err) {
        console.error('Failed to purge session:', err);
        reset();
        navigate('/');
      }
    } else {
      navigate('/');
    }
  };

  const cancelHomeNavigation = () => {
    setShowHomeWarning(false);
  };

  const handleLogout = async () => {
    if (kiosk.sessionId) {
      setShowHomeWarning(true);
      return;
    }
    setLoggingOut(true);
    try {
      await logout();
      reset();
      navigate('/', { replace: true });
    } catch {
      reset();
      navigate('/', { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  const toggleTextSize = () => {
    document.documentElement.classList.toggle('text-large');
    const isLarge = document.documentElement.classList.contains('text-large');
    localStorage.setItem('textSize', isLarge ? 'large' : 'normal');
  };

  return (
    <>
      <header className="bg-white/90 dark:bg-gray-800/90 backdrop-blur border-b border-gray-200 dark:border-gray-700 px-5 sm:px-8 py-4 flex items-center justify-between gap-4 sticky top-0 z-20">
        <Link to="/" onClick={(e) => { e.preventDefault(); handleLogoClick(); }} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md">
            <Activity size={20} className="text-white" />
          </div>
          <div>
            <strong className="block text-lg text-gray-900 dark:text-gray-100">MediKiosk</strong>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Clinical Intake System</span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {showLanguageSelector && user && (
            <select
              value={user.preferred_language || 'en'}
              onChange={async (e) => {
                const newLang = e.target.value;
                try {
                  await api.patch('/patients/me', { preferred_language: newLang });
                  i18n.changeLanguage(newLang);
                  // Only reload if it's a patient and we need to refresh data
                  if (user.role === 'patient') {
                    // Don't reload - let the page re-render with new language
                    // The user state will be updated by the auth context
                  }
                } catch (err) {
                  console.error('Failed to update language:', err);
                }
              }}
              className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-gray-100"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
              <option value="mr">मराठी</option>
            </select>
          )}

          {!user && (
            <Link
              to="/doctor/login"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium text-sm hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
            >
              <Stethoscope size={16} />
              <span>Staff</span>
            </Link>
          )}

          <button
            onClick={toggleDarkMode}
            className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-target group"
            aria-label="Toggle dark mode"
            title="Dark/Light Mode"
          >
            {darkMode ? <Sun size={20} className="text-gray-300 group-hover:text-primary-400 transition-colors" /> : <Moon size={20} className="text-gray-600 group-hover:text-primary-600 transition-colors" />}
          </button>

          <button
            onClick={toggleTextSize}
            className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-target group font-bold text-gray-600 dark:text-gray-300"
            aria-label="Toggle text size"
            title="Text Size"
          >
            T
          </button>

          <button
            onClick={() => setShowHelpModal(true)}
            className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-target group"
            aria-label="Help"
            title="Help"
          >
            <HelpCircle size={20} className="text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" />
          </button>

          {showLogout && (
            <button onClick={handleLogout} disabled={loggingOut} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50">
              <LogOut size={16} /> {loggingOut ? 'Signing out…' : 'Log out'}
            </button>
          )}
        </div>
      </header>

      {showHomeWarning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-scale-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warning-100 flex items-center justify-center">
              <Activity size={32} className="text-warning-600" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-center text-gray-800 dark:text-gray-100">{t('session_warning_title')}</h3>
            <p className="mb-6 text-center leading-relaxed text-gray-600 dark:text-gray-300">{t('session_warning_message')}</p>
            <div className="flex gap-3">
              <button
                onClick={cancelHomeNavigation}
                className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t('help_title')}</h3>
              <button onClick={() => setShowHelpModal(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={24} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>{t('help_introduction')}</p>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <h4 className="font-semibold mb-2 text-gray-800 dark:text-gray-100">{t('help_steps_title')}</h4>
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
    </>
  );
}
