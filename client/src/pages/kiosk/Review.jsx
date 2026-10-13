import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

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

  useEffect(() => {
    if (!kiosk.sessionId) return;
    api.get(`/sessions/${kiosk.sessionId}`)
      .then(r => setSession(r.data))
      .finally(() => setLoading(false));
  }, [kiosk.sessionId]);

  const submit = async () => {
    setSubmitting(true);
    try {
      const r = await api.post('/encounters', {
        patient_id: kiosk.patientId,
        session_id: kiosk.sessionId,
        language: kiosk.language,
        ayush_mode: kiosk.ayushMode
      });
      update({ encounterId: r.data.id });
      navigate('/kiosk/done');
    } catch { alert('Submission failed'); }
    finally { setSubmitting(false); }
  };

  if (!kiosk.sessionId) {
    return (
      <KioskShell step="Review">
        <div className="flex flex-col items-center gap-4 mt-10 text-center">
          <p className="text-gray-500">{t('no_session')}</p>
          <button onClick={() => navigate('/kiosk/identify')}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">
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
      <div className="w-full mt-4 flex flex-col gap-5">
        <h1 className="text-2xl font-bold text-gray-800">{t('review_title')}</h1>
        <p className="text-gray-500 text-sm">{t('review_note')}</p>

        <div className="bg-white border rounded-2xl divide-y">
          {slots.length === 0 && (
            <p className="p-4 text-gray-400 text-sm">{t('no_answers')}</p>
          )}
          {slots.map((slot, i) => (
            <div key={i} className="p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 uppercase tracking-wide">{slot.slot_id.replace(/_/g, ' ')}</span>
                <ProvenanceChip source={slot.source} confirmedBy={slot.confirmed_by} />
              </div>
              <p className="font-medium text-gray-800">{slot.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <strong>Note:</strong> {t('review_note')}
        </div>

        <button onClick={submit} disabled={submitting}
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50">
          {submitting ? t('submitting') : t('submit_continue')}
        </button>
      </div>
    </KioskShell>
  );
}
