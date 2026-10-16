import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';

import KioskShell from '../../components/KioskShell.jsx';
import ProvenanceChip from '../../components/ProvenanceChip.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { useKiosk } from '../../context/KioskContext.jsx';
import api from '../../services/api.js';

export default function Review() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { kiosk, update } = useKiosk();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!kiosk.sessionId) return;
    console.log('Fetching session data for review:', kiosk.sessionId);
    api.get(`/sessions/${kiosk.sessionId}`)
      .then(r => {
        console.log('Session data fetched:', r.data);
        setSession(r.data);
      })
      .catch(err => {
        console.error('Error fetching session:', err);
        console.error('Error response:', err.response?.data);
      })
      .finally(() => setLoading(false));
  }, [kiosk.sessionId]);

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      console.log('Creating encounter:', { patientId: kiosk.patientId, sessionId: kiosk.sessionId, language: kiosk.language });
      const r = await api.post('/encounters', {
        patient_id: kiosk.patientId,
        session_id: kiosk.sessionId,
        language: kiosk.language,
        ayush_mode: kiosk.ayushMode
      });
      console.log('Encounter created:', r.data);
      update({ encounterId: r.data.id });
      navigate('/kiosk/done');
    } catch (err) {
      console.error('Encounter creation error:', err);
      console.error('Encounter creation error response:', err.response?.data);
      setError(err.response?.data?.error || 'Submission failed. Please try again.');
    }
    finally { setSubmitting(false); }
  };

  if (!kiosk.sessionId) {
    return (
      <KioskShell step="Review">
        <div className="flex flex-col items-center gap-4 mt-10 text-center animate-scale-in">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
            <CheckCircle size={32} className="text-gray-400" />
          </div>
          <p className="text-gray-500">{t('no_session')}</p>
          <button onClick={() => navigate('/kiosk/identify')}
            className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-bold hover:from-primary-600 hover:to-primary-700 shadow-md shadow-primary-200 transition-all">
            {t('start_over')}
          </button>
        </div>
      </KioskShell>
    );
  }

  if (loading) return <KioskShell step="Review"><LoadingSpinner /></KioskShell>;

  const slots = session?.slots || [];

  return (
    <KioskShell step="Review" backTo="/kiosk/documents">
      <div className="w-full flex flex-col gap-6 animate-slide-up">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('review_title')}</h1>
          <p className="text-gray-500 text-lg">{t('review_note')}</p>
        </div>

        {error && (
          <div className="bg-error-50 border border-error-200 rounded-xl p-3 text-sm text-error-700 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-error-200 flex items-center justify-center flex-shrink-0">
              <span className="text-error-700 text-xs font-bold">!</span>
            </span>
            {error}
          </div>
        )}

        <div className="card divide-y divide-gray-100">
          {slots.length === 0 && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle size={32} className="text-gray-300" />
              </div>
              <p className="text-gray-400">{t('no_answers')}</p>
            </div>
          )}
          {slots.map((slot, i) => (
            <div key={i} className="p-5 flex flex-col gap-2 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{slot.slot_id.replace(/_/g, ' ')}</span>
                <ProvenanceChip source={slot.source} confirmedBy={slot.confirmed_by} />
              </div>
              <p className="font-medium text-gray-800 text-lg">{slot.value}</p>
            </div>
          ))}
        </div>

        <div className="card p-4 bg-warning-50 border-warning-200">
          <div className="flex items-start gap-3">
            <CheckCircle size={20} className="text-warning-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-warning-800">{t('review_note')}</p>
              <p className="text-sm text-warning-700 mt-1">Please review your answers before submitting. Once submitted, the doctor will review your information.</p>
            </div>
          </div>
        </div>

        <button onClick={submit} disabled={submitting}
          className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-4 rounded-2xl font-bold text-lg disabled:opacity-50 shadow-md shadow-primary-200 transition-all hover:shadow-lg flex items-center justify-center gap-2">
          {submitting ? <Loader2 size={20} className="animate-spin" /> : t('submit_continue')}
          <ArrowRight size={20} />
        </button>
      </div>
    </KioskShell>
  );
}
