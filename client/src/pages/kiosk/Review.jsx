import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, ArrowRight, Loader2, Edit2, X, Save, AlertTriangle, FileText, Stethoscope, Pill, History, User, Clock, Shield } from 'lucide-react';

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
    // Use the raw value (not formatted) for editing
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
      const response = await api.patch(`/sessions/${kiosk.sessionId}`, {
        slots: [{
          slot_id: editingSlot.slot_id,
          value: editValue
        }]
      });
      console.log('Update response:', response.data);
      // Reload session to get updated data
      const r = await api.get('/sessions/' + kiosk.sessionId);
      setSession(r.data);
      setEditingSlot(null);
      setEditValue('');
    } catch (err) {
      console.error('Failed to update slot:', err.response?.data || err.message);
      setError(err.response?.data?.error || 'Failed to update. Please try again.');
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
            className="text-gray-500 dark:text-gray-400 text-sm font-medium hover:text-gray-700 dark:hover:text-gray-300"
          >
            Start Over
          </button>
        </div>
      </KioskShell>
    );
  }

  const slots = session?.slots || [];

  // Group slots by category
  const groupSlots = (slots) => {
    const groups = {
      complaint: [],
      history: [],
      medicines: [],
      family: [],
      other: []
    };

    slots.forEach(slot => {
      const slotId = slot.slot_id.toLowerCase();
      if (slotId.includes('complaint') || slotId.includes('chief') || slotId.includes('onset') || slotId.includes('duration') || slotId.includes('character') || slotId.includes('severity') || slotId.includes('location') || slotId.includes('radiation')) {
        groups.complaint.push(slot);
      } else if (slotId.includes('medical') || slotId.includes('surgical') || slotId.includes('history')) {
        groups.history.push(slot);
      } else if (slotId.includes('medicine') || slotId.includes('drug') || slotId.includes('allergy')) {
        groups.medicines.push(slot);
      } else if (slotId.includes('family')) {
        groups.family.push(slot);
      } else {
        groups.other.push(slot);
      }
    });

    return groups;
  };

  const groupedSlots = groupSlots(slots);

  // Format display value - handle JSON arrays and underscores
  const formatDisplayValue = (value) => {
    if (!value) return <span className="text-gray-400 italic">Not provided</span>;

    // Try to parse as JSON array
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed
            .map(item => formatDisplayValue(item))
            .join(', ');
        }
      } catch (e) {
        // If parsing fails, continue with original value
      }
    }

    // Replace underscores with spaces and capitalize first letter
    const formatted = value
      .replace(/_/g, ' ')
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    return formatted;
  };

  const renderSlot = (slot) => (
    <div key={slot.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">
            {slot.slot_id.replace(/_/g, ' ')}
          </label>
          {editingSlot === slot.id ? (
            <div className="flex gap-2 mt-2">
              <input
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                autoFocus
              />
              <button onClick={saveEdit} disabled={saving} className="px-4 py-2 bg-success-500 text-white rounded-lg text-sm font-medium hover:bg-success-600 disabled:opacity-50 flex items-center gap-1">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              </button>
              <button onClick={cancelEdit} className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500">
                <X size={14} />
              </button>
            </div>
          ) : (
            <p className="font-medium text-gray-900 dark:text-gray-100 text-base">{formatDisplayValue(slot.value)}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <ProvenanceChip source={slot.source} confirmedBy={slot.confirmed_by} />
          {editingSlot !== slot.id && (
            <button onClick={() => startEdit(slot)} className="p-2 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors" title="Edit">
              <Edit2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderSection = (title, icon, slots, emptyMessage) => {
    if (slots.length === 0) return null;
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            {icon}
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h3>
        </div>
        <div className="grid gap-3">
          {slots.map(renderSlot)}
        </div>
      </div>
    );
  };

  return (
    <KioskShell step="Review" backTo="/kiosk/documents">
      <div className="w-full flex flex-col gap-6 animate-slide-up max-w-4xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('review_title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg">{t('review_note')}</p>
        </div>

        {error && (
          <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-xl p-4 text-sm text-error-700 dark:text-error-400 flex items-center gap-3">
            <AlertTriangle size={20} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {slots.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-700">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
              <FileText size={40} className="text-gray-300 dark:text-gray-500" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-lg">{t('no_answers')}</p>
          </div>
        ) : (
          <>
            {renderSection('Chief Complaint', <Stethoscope size={20} className="text-primary-600 dark:text-primary-400" />, groupedSlots.complaint)}
            {renderSection('Medical History', <History size={20} className="text-primary-600 dark:text-primary-400" />, groupedSlots.history)}
            {renderSection('Medications & Allergies', <Pill size={20} className="text-primary-600 dark:text-primary-400" />, groupedSlots.medicines)}
            {renderSection('Family History', <User size={20} className="text-primary-600 dark:text-primary-400" />, groupedSlots.family)}
            {groupedSlots.other.length > 0 && renderSection('Additional Information', <FileText size={20} className="text-primary-600 dark:text-primary-400" />, groupedSlots.other)}
          </>
        )}

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-5 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <Shield size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-1">Doctor Review Required</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                This information will be reviewed and verified by your doctor before any clinical decisions are made. Please ensure all details are accurate before submitting.
              </p>
            </div>
          </div>
        </div>

        <button onClick={submit} disabled={submitting}
          className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-4 rounded-2xl font-bold text-lg disabled:opacity-50 shadow-lg shadow-primary-200 dark:shadow-primary-900/30 transition-all hover:shadow-xl dark:hover:shadow-primary-900/50 flex items-center justify-center gap-3">
          {submitting ? <Loader2 size={22} className="animate-spin" /> : t('submit_continue')}
          <ArrowRight size={22} />
        </button>
      </div>
    </KioskShell>
  );
}
