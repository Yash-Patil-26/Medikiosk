import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle,
  Trash2,
  AlertTriangle,
  RefreshCw,
  LoaderCircle
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
      <div className="w-full mt-8 flex flex-col items-center gap-6 text-center">
        {purgeStatus === 'success' ? (
          <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center">
            <CheckCircle size={44} className="text-teal-600" />
          </div>
        ) : purgeStatus === 'failed' ? (
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle size={44} className="text-red-600" />
          </div>
        ) : (
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
            <LoaderCircle size={44} className="text-blue-600 animate-spin" />
          </div>
        )}

        <h1 className="text-3xl font-extrabold text-gray-800">
          {t('done_title')}
        </h1>

        <p className="text-gray-500 max-w-sm">
          {t('session_complete_desc')}
        </p>

        {purgeStatus === 'purging' && (
          <div role="status" className="w-full rounded-xl border bg-white p-4 text-sm text-gray-600">
            {t('purge_pending')}
          </div>
        )}

        {purgeStatus === 'failed' && (
          <div role="alert" className="w-full rounded-xl border border-red-200 bg-red-50 p-4 text-left">
            <h2 className="font-bold text-red-800 mb-2">
              {t('purge_failed')}
            </h2>
            <p className="text-sm text-red-700">{purgeError}</p>
            <p className="text-sm text-red-700 mt-2">
              {t('purge_error')}
            </p>
          </div>
        )}

        {purgeStatus === 'success' && (
          <div className="w-full bg-white border rounded-2xl p-5 text-left">
            <div className="flex items-center gap-2 mb-4">
              <Trash2 size={20} className="text-teal-600" />
              <h2 className="font-bold text-gray-800 text-lg">
                {t('session_purged')}
              </h2>
            </div>

            <div className="flex flex-col gap-2">
              {items.map((item, index) => (
                <div key={index} className="flex items-start gap-3 text-sm text-gray-700">
                  <CheckCircle size={16} className="text-teal-500 shrink-0 mt-0.5" />
                  {item}
                </div>
              ))}
            </div>

            {retained.length > 0 && (
              <>
                <h3 className="font-semibold text-gray-800 mt-5 mb-3">
                  {t('purge_retained_title')}
                </h3>
                <div className="flex flex-col gap-2">
                  {retained.map((item, index) => (
                    <div key={index} className="flex items-start gap-3 text-sm text-gray-600">
                      <CheckCircle size={16} className="text-blue-500 shrink-0 mt-0.5" />
                      {item}
                    </div>
                  ))}
                </div>
              </>
            )}

            <p className="text-xs text-gray-500 mt-4">
              {t('purge_note')}
            </p>
          </div>
        )}

        {purgeStatus === 'failed' ? (
          <div className="w-full flex flex-col gap-3">
            {sessionIdRef.current && (
              <button
                onClick={purgeSession}
                disabled={purgeStatus === 'purging'}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw size={18} />
                {t('purge_retry')}
              </button>
            )}

            <button
              onClick={leaveScreen}
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200"
            >
              {t('purge_leave')}
            </button>
          </div>
        ) : purgeStatus === 'success' ? (
          <button
            onClick={leaveScreen}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700"
          >
            {t('return_home')}
          </button>
        ) : null}
      </div>
    </KioskShell>
  );
}