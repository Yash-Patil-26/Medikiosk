import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, ArrowRight, Loader2, Edit2, X, Save } from 'lucide-react';

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
  const [loadError, setLoadError] = useState('');
  const [editingSlot, setEditingSlot] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const loadSession = useCallback(async () => {
    if (!kiosk.sessionId) return;

    setLoading(true);
    setLoadError('');

    try {
      const r = await api.get('/sessions/' + kiosk.sessionId);
      setSession(r.data);
    } catch {
      setLoadError('Could not load your answers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [kiosk.sessionId]);

  const startEdit = (slot) => {
    setEditingSlot(slot.id);
    setEditValue(slot.value);
  };

  const cancelEdit = () => {
    setEditingSlot(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (!editingSlot) return;
    setSaving(true);
    setError('');
    try {
      await api.post(`/dialogue/${kiosk.sessionId}/answer`, {
        node_id: editingSlot.node_id || editingSlot.slot_id,
        slot_id: editingSlot.slot_id,
        value: editValue,
        source: 'touch',
        raw_text: editValue,
        confidence: 1.0,
        confirmed_by: 'touch'
      });
      // Reload session to get updated data
      const r = await api.get('/sessions/' + kiosk.sessionId);
      setSession(r.data);
      setEditingSlot(null);
      setEditValue('');
    } catch {
      setError('Failed to update. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const r = await api.post('/encounters', {
        patient_id: kiosk.patientId,
        session_id: kiosk.sessionId,
        language: kiosk.language,
        ayush_mode: kiosk.ayushMode
      });
      update({ encounterId: r.data.id });
      navigate('/kiosk/done');
    } catch {
      setError('Submission failed. Please try again.');
    }
    finally { setSubmitting(false); }
  };

  if (!kiosk.sessionId) {
    return (
      <KioskShell step="Review">
        <div className="flex flex-col items-center gap-4 mt-10 text-center animate-scale-in">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <CheckCircle size={32} className="text-gray-300 dark:text-gray-500" />
          </div>
          <p className="text-gray-500 dark:text-gray-400">{t('no_session')}</p>
          <button onClick={() => navigate('/me')}
            className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-bold hover:from-primary-600 hover:to-primary-700 shadow-md shadow-primary-200 transition-all">
            {t('start_over')}
          </button>
        </div>
      </KioskShell>
    );
  }

  if (loading) return <KioskShell step="Review"><LoadingSpinner /></KioskShell>;

  if (loadError) {
    return (
      <KioskShell step="Review">
        <div className="flex flex-col items-center gap-4 mt-10 text-center">
          <p role="alert" className="text-error-700">{loadError}</p>
          <button
            type="button"
            onClick={loadSession}
            className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-bold hover:from-primary-600 hover:to-primary-700 shadow-md shadow-primary-200 transition-all"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={() => navigate('/me')}
            className="text-gray-500 text-sm font-medium hover:text-gray-700"
          >
            Start Over
          </button>
        </div>
      </KioskShell>
    );
  }

  const slots = session?.slots || [];

  return (
    <KioskShell step="Review" backTo="/kiosk/documents">
      <div className="w-full flex flex-col gap-6 animate-slide-up">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('review_title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg">{t('review_note')}</p>
        </div>

        {error && (
          <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-xl p-3 text-sm text-error-700 dark:text-error-400 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-error-200 dark:bg-error-800 flex items-center justify-center flex-shrink-0">
              <span className="text-error-700 dark:text-error-400 text-xs font-bold">!</span>
            </span>
            {error}
          </div>
        )}

        <div className="card divide-y divide-gray-100 dark:divide-gray-700">
          {slots.length === 0 && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
                <CheckCircle size={32} className="text-gray-300 dark:text-gray-500" />
              </div>
              <p className="text-gray-400 dark:text-gray-500">{t('no_answers')}</p>
            </div>
          )}
          {slots.map((slot, i) => (
            <div key={i} className="p-4 flex flex-col gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-semibold">{slot.slot_id.replace(/_/g, ' ')}</span>
                <div className="flex items-center gap-2">
                  <ProvenanceChip source={slot.source} confirmedBy={slot.confirmed_by} />
                  {editingSlot === slot.id ? (
                    <button onClick={cancelEdit} className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded">
                      <X size={16} />
                    </button>
                  ) : (
                    <button onClick={() => startEdit(slot)} className="p-1 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded">
                      <Edit2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              {editingSlot === slot.id ? (
                <div className="flex gap-2">
                  <input
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                  <button onClick={saveEdit} disabled={saving} className="px-3 py-2 bg-success-500 text-white rounded-lg text-sm font-medium hover:bg-success-600 disabled:opacity-50 flex items-center gap-1">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  </button>
                </div>
              ) : (
                <p className="font-medium text-gray-800 dark:text-gray-200 text-lg">{slot.value}</p>
              )}
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
