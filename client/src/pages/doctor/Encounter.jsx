import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, PenLine, AlertTriangle, Download, CheckCircle, User, Clock, FileText, Activity } from 'lucide-react';
import RedFlagBanner from '../../components/RedFlagBanner.jsx';
import ProvenanceChip from '../../components/ProvenanceChip.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import api from '../../services/api.js';

export default function DoctorEncounter() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [encounter, setEncounter] = useState(null);
  const [summary, setSummary] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [fhir, setFhir] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/encounters/${id}`).then(r => setEncounter(r.data)),
      api.get(`/encounters/${id}/summary`).then(r => setSummary(r.data.summary_draft_json))
    ]).finally(() => setLoading(false));
  }, [id]);

  const sign = async () => {
    setSigning(true);
    setError('');
    try {
      await api.patch(`/encounters/${id}/summary`, { summary_draft_json: summary, doctor_notes: notes });
      const r = await api.post(`/encounters/${id}/sign`);
      setFhir(r.data.fhir);
      setSigned(true);
    } catch (e) {
      setError(e.response?.data?.error || 'Sign-off failed');
    }
    finally { setSigning(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/20 flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );

  const slots = summary?.slots || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/20 flex flex-col">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/doctor')} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ArrowLeft size={22} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md">
              <Activity size={20} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-gray-800 text-lg leading-tight">MediKiosk</span>
              <span className="text-xs text-gray-500 font-medium block">Encounter Review</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {signed && fhir && (
            <button onClick={() => {
              const blob = new Blob([JSON.stringify(fhir, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `fhir-${id}.json`;
              a.click();
            }} className="flex items-center gap-2 px-4 py-2 bg-success-500 text-white rounded-xl text-sm font-medium hover:bg-success-600 transition-colors">
              <Download size={16} /> Download FHIR
            </button>
          )}
          <button onClick={() => navigate('/login')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Patient info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                  <User size={32} className="text-primary-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{encounter?.patient_name || 'Anonymous'}</h2>
                  <p className="text-sm text-gray-500">ID: {encounter?.patient_id}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={16} className="text-gray-400" />
                  <span className="text-gray-600">{new Date(encounter?.created_at).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText size={16} className="text-gray-400" />
                  <span className="text-gray-600 capitalize">{encounter?.complaint_label || 'Not specified'}</span>
                </div>
              </div>
            </div>

            {encounter?.red_flags?.length > 0 && (
              <RedFlagBanner flags={encounter.red_flags} />
            )}
          </div>

          {/* Center: summary */}
          <div className="lg:col-span-2 space-y-6">
            {error && (
              <div className="bg-error-50 border border-error-200 rounded-xl p-4 text-sm text-error-700 flex items-center gap-2">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}
            {!signed && (
              <div className="bg-warning-50 border border-warning-200 rounded-xl p-4 text-sm text-warning-800 flex items-center gap-2">
                <AlertTriangle size={16} />
                This summary is a draft and requires physician verification.
              </div>
            )}

            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Patient Summary</h3>
                {!signed && (
                  <button onClick={() => setSummary(summary)} className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium">
                    <PenLine size={16} /> Edit
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {slots.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <FileText size={48} className="mx-auto mb-3 text-gray-300" />
                    <p>No information collected</p>
                  </div>
                ) : (
                  slots.map((slot, i) => (
                    <div key={i} className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{slot.slot_id.replace(/_/g, ' ')}</span>
                        <ProvenanceChip source={slot.source} confirmedBy={slot.confirmed_by} />
                      </div>
                      <p className="font-medium text-gray-800">{slot.value}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Doctor Notes</h3>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={signed}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white resize-none"
                rows={4}
                placeholder="Add your clinical notes here..."
              />
            </div>

            {!signed ? (
              <button onClick={sign} disabled={signing}
                className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-4 rounded-2xl font-bold text-lg disabled:opacity-50 shadow-md shadow-primary-200 transition-all hover:shadow-lg flex items-center justify-center gap-2">
                {signing ? 'Signing...' : 'Sign & Complete Encounter'}
                <CheckCircle size={20} />
              </button>
            ) : (
              <div className="card p-6 bg-success-50 border-success-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-success-100 flex items-center justify-center">
                    <CheckCircle size={24} className="text-success-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-success-800">Encounter Signed</h3>
                    <p className="text-sm text-success-700">FHIR bundle generated successfully</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
