import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Moon, Sun, Type, HelpCircle, X, LogOut } from 'lucide-react';
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
      <header className={`bg-white/90 backdrop-blur border-b border-gray-200 px-5 sm:px-8 py-4 flex items-center justify-between gap-4 sticky top-0 z-20 ${darkMode ? 'dark:bg-gray-800 dark:border-gray-700' : ''}`}>
        <Link to="/" onClick={(e) => { e.preventDefault(); handleLogoClick(); }} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md">
            <Activity size={20} className="text-white" />
          </div>
          <div>
            <strong className="block text-gray-900 text-lg">MediKiosk</strong>
            <span className="text-xs text-gray-500">Clinical Intake System</span>
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
                  if (user.role === 'patient') {
                    // Update user state - handled by component that manages user
                    window.location.reload();
                  }
                  i18n.changeLanguage(newLang);
                } catch (err) {
                  console.error('Failed to update language:', err);
                }
              }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
              <option value="mr">मराठी</option>
            </select>
          )}

          <button 
            onClick={toggleDarkMode}
            className="p-2.5 rounded-xl hover:bg-gray-100 transition-colors touch-target group" 
            aria-label="Toggle dark mode"
            title="Dark/Light Mode"
          >
            {darkMode ? <Sun size={20} className="text-gray-600 group-hover:text-primary-600 transition-colors" /> : <Moon size={20} className="text-gray-600 group-hover:text-primary-600 transition-colors" />}
          </button>

          <button 
            onClick={toggleTextSize}
            className="p-2.5 rounded-xl hover:bg-gray-100 transition-colors touch-target group font-bold text-gray-600"
            aria-label="Toggle text size"
            title="Text Size"
          >
            T
          </button>

          <button 
            onClick={() => setShowHelpModal(true)}
            className="p-2.5 rounded-xl hover:bg-gray-100 transition-colors touch-target group" 
            aria-label="Help"
            title="Help"
          >
            <HelpCircle size={20} className="text-gray-400 group-hover:text-primary-600 transition-colors" />
          </button>

          {showLogout && (
            <button onClick={handleLogout} disabled={loggingOut} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50">
              <LogOut size={16} /> {loggingOut ? 'Signing out…' : 'Log out'}
            </button>
          )}
        </div>
      </header>

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
    </>
  );
}
