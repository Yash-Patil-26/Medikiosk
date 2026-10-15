import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Home
} from 'lucide-react';
import KioskShell from '../../components/KioskShell.jsx';
import { useKiosk } from '../../context/KioskContext.jsx';
import api from '../../services/api.js';

export default function Done() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { kiosk, reset } = useKiosk();

  const [purgeStatus, setPurgeStatus] = useState('purging');
  const [purgeError, setPurgeError] = useState('');
  const [items, setItems] = useState([]);
  const [retained, setRetained] = useState([]);

  // Keep the capability ID available for retries until the server confirms purge.
  const sessionIdRef = useRef(kiosk.sessionId);
  const inFlightRef = useRef(false);

  const purgeSession = async () => {
    if (inFlightRef.current) return;

    const sessionId = sessionIdRef.current;

    if (!sessionId) {
      setPurgeStatus('failed');
      setPurgeError(t('purge_missing_session'));
      return;
    }

    inFlightRef.current = true;
    setPurgeStatus('purging');
    setPurgeError('');

    try {
      const response = await api.delete(`/sessions/${sessionId}`);
      const result = response.data;

      if (
        result?.purged !== true ||
        !Array.isArray(result.items) ||
        !Array.isArray(result.retained)
      ) {
        throw new Error(t('purge_unconfirmed'));
      }

      setItems(result.items);
      setRetained(result.retained);
      setPurgeStatus('success');

      // Clear browser-side kiosk state only after the server confirms purge.
      sessionIdRef.current = null;
      reset();
    } catch (error) {
      console.error('Session purge was not confirmed:', error);
      setPurgeStatus('failed');
      setPurgeError(
        error.message === t('purge_unconfirmed')
          ? t('purge_unconfirmed')
          : t('purge_error')
      );
      // Intentionally preserve kiosk state and session ID for Retry.
    } finally {
      inFlightRef.current = false;
    }
  };

  useEffect(() => {
    void purgeSession();
    // Purge once on entry. The in-flight ref also guards development Strict Mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leaveScreen = () => {
    reset();
    navigate('/');
  };

  return (
    <KioskShell step="Done" showBack={false}>
      <div className="w-full flex flex-col items-center gap-6 text-center animate-scale-in">
        {purgeStatus === 'success' ? (
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-success-100 to-success-200 flex items-center justify-center shadow-lg shadow-success-200">
            <CheckCircle size={48} className="text-success-600" />
          </div>
        ) : purgeStatus === 'failed' ? (
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-error-100 to-error-200 flex items-center justify-center shadow-lg shadow-error-200">
            <AlertTriangle size={48} className="text-error-600" />
          </div>
        ) : (
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center shadow-lg shadow-primary-200">
            <Loader2 size={48} className="text-primary-600 animate-spin" />
          </div>
        )}

        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3">
            {t('done_title')}
          </h1>
          <p className="text-gray-500 text-lg max-w-sm">
            {t('session_complete_desc')}
          </p>
        </div>

        {purgeStatus === 'purging' && (
          <div role="status" className="card p-5 text-sm text-gray-600 w-full max-w-md">
            <div className="flex items-center gap-3">
              <Loader2 size={20} className="text-primary-500 animate-spin" />
              <span>{t('purge_pending')}</span>
            </div>
          </div>
        )}

        {purgeStatus === 'failed' && (
          <div role="alert" className="card p-5 text-left w-full max-w-md border-error-200 bg-error-50">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={20} className="text-error-600" />
              <h2 className="font-bold text-error-800">
                {t('purge_failed')}
              </h2>
            </div>
            <p className="text-sm text-error-700 mb-2">{purgeError}</p>
            <p className="text-sm text-error-700">
              {t('purge_error')}
            </p>
          </div>
        )}

        {purgeStatus === 'success' && (
          <div className="card p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-success-100 to-success-200 flex items-center justify-center">
                <Trash2 size={24} className="text-success-600" />
              </div>
              <h2 className="font-bold text-gray-800 text-xl">
                {t('session_purged')}
              </h2>
            </div>

            <div className="flex flex-col gap-3 mb-5">
              {items.map((item, index) => (
                <div key={index} className="flex items-start gap-3 text-sm text-gray-700 p-3 bg-success-50 rounded-xl">
                  <CheckCircle size={18} className="text-success-600 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {retained.length > 0 && (
              <>
                <h3 className="font-semibold text-gray-800 mb-3">
                  {t('purge_retained_title')}
                </h3>
                <div className="flex flex-col gap-3 mb-5">
                  {retained.map((item, index) => (
                    <div key={index} className="flex items-start gap-3 text-sm text-gray-600 p-3 bg-primary-50 rounded-xl">
                      <CheckCircle size={18} className="text-primary-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <p className="text-xs text-gray-500 text-center">
              {t('purge_note')}
            </p>
          </div>
        )}

        {purgeStatus === 'failed' ? (
          <div className="w-full flex flex-col gap-3 max-w-md">
            {sessionIdRef.current && (
              <button
                onClick={purgeSession}
                disabled={purgeStatus === 'purging'}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-4 rounded-2xl font-bold text-lg disabled:opacity-50 shadow-md shadow-primary-200 transition-all"
              >
                <RefreshCw size={20} />
                {t('purge_retry')}
              </button>
            )}

            <button
              onClick={leaveScreen}
              className="w-full bg-gray-100 text-gray-700 py-3.5 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              {t('purge_leave')}
            </button>
          </div>
        ) : purgeStatus === 'success' ? (
          <button
            onClick={leaveScreen}
            className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-4 rounded-2xl font-bold text-lg shadow-md shadow-primary-200 transition-all hover:shadow-lg flex items-center justify-center gap-2 max-w-md"
          >
            <Home size={20} />
            {t('return_home')}
          </button>
        ) : null}
      </div>
    </KioskShell>
  );
}
