import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Upload, FileText, CheckCircle, AlertCircle, ArrowRight, X } from 'lucide-react';
import KioskShell from '../../components/KioskShell.jsx';
import { useKiosk } from '../../context/KioskContext.jsx';
import api from '../../services/api.js';

const REFERENCE_RANGES = {
  Hemoglobin: { min: 12, max: 16, unit: 'g/dL' },
  WBC: { min: 4, max: 11, unit: 'x10³/µL' },
  Platelets: { min: 150, max: 400, unit: 'x10³/µL' }
};

function LabRow({ lab }) {
  const ref = REFERENCE_RANGES[lab.name];
  const val = parseFloat(lab.value);
  const outOfRange = ref && (val < ref.min || val > ref.max);
  return (
    <div className={`flex items-center justify-between p-3 rounded-xl text-sm ${outOfRange ? 'bg-warning-50 border border-warning-200' : 'bg-gray-50'}`}>
      <span className="font-medium text-gray-800">{lab.name}</span>
      <span className="font-semibold">{lab.value} {lab.unit}</span>
      <span className="text-xs text-gray-500">Ref: {lab.referenceRange}</span>
      {outOfRange
        ? <span className="text-xs text-warning-600 flex items-center gap-1 font-medium"><AlertCircle size={14} /> Outside range</span>
        : <span className="text-xs text-success-600 flex items-center gap-1 font-medium"><CheckCircle size={14} /> Normal</span>}
    </div>
  );
}

export default function Documents() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { kiosk } = useKiosk();
  const [extractions, setExtractions] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(null);
  const [error, setError] = useState('');

  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('File too large. Max 5MB.'); return; }
    setUploading(true); setError('');
    try {
      console.log('Uploading document:', { fileName: file.name, fileSize: file.size, sessionId: kiosk.sessionId });
      const fd = new FormData();
      fd.append('file', file);
      fd.append('session_id', kiosk.sessionId);
      const r = await api.post('/documents/extract', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      console.log('Upload successful:', r.data);
      setExtractions(p => [...p, { ...r.data, id: r.data.id, verified: false, fileName: file.name }]);
    } catch (err) {
      console.error('Upload error:', err);
      console.error('Upload error response:', err.response?.data);
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    }
    finally { setUploading(false); }
  };

  const verify = async (idx, docId) => {
    setVerifying(idx);
    try {
      await api.post(`/documents/${docId}/verify`, { session_id: kiosk.sessionId });
      setExtractions(p => p.map((e, i) => i === idx ? { ...e, verified: true } : e));
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setVerifying(null);
    }
  };

  const remove = (idx) => {
    setExtractions(p => p.filter((_, i) => i !== idx));
  };

  return (
    <KioskShell step="Documents" backTo="/kiosk/interview">
      <div className="w-full flex flex-col gap-6 animate-slide-up">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('documents_title')}</h1>
          <p className="text-gray-500 text-lg">{t('documents_hint')}</p>
        </div>

        <label className={`card flex flex-col items-center justify-center border-2 border-dashed rounded-3xl p-10 cursor-pointer transition-all
          ${uploading ? 'border-primary-300 bg-primary-50' : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50 group'}`}>
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${uploading ? 'animate-pulse' : ''}`}>
            <Upload size={40} className="text-primary-500" />
          </div>
          <p className="font-semibold text-gray-700 text-lg">{uploading ? 'Uploading...' : 'Tap to upload document'}</p>
          <p className="text-sm text-gray-400 mt-2">JPG, PNG, PDF · Max 5MB</p>
          <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={upload} className="hidden" disabled={uploading} />
        </label>

        {error && (
          <div className="bg-error-50 border border-error-200 rounded-xl p-3 text-sm text-error-700 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-error-200 flex items-center justify-center flex-shrink-0">
              <span className="text-error-700 text-xs font-bold">!</span>
            </span>
            {error}
          </div>
        )}

        {extractions.map((ext, idx) => (
          <div key={idx} className="card p-5 flex flex-col gap-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                  <FileText size={24} className="text-primary-500" />
                </div>
                <div>
                  <span className="font-semibold text-gray-800">{ext.fileName}</span>
                  <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full ml-2">{ext.docType}</span>
                </div>
              </div>
              <button onClick={() => remove(idx)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-error-500 transition-colors">
                <X size={18} />
              </button>
            </div>
            {ext.date && <p className="text-sm text-gray-500">Date: {ext.date} · Provider: {ext.provider}</p>}

            {ext.labs?.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Lab Results</p>
                {ext.labs.map((lab, i) => <LabRow key={i} lab={lab} />)}
              </div>
            )}
            {ext.medications?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Medications</p>
                {ext.medications.map((m, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-xl text-sm text-gray-700 flex items-center gap-2">
                    <span className="font-medium">{m.name}</span>
                    <span className="text-gray-400">·</span>
                    <span>{m.dose}</span>
                    <span className="text-gray-400">·</span>
                    <span>{m.frequency}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">Confidence: {Math.round((ext.confidence || 0) * 100)}%</span>
              {ext.verified
                ? <span className="flex items-center gap-2 text-success-600 text-sm font-medium"><CheckCircle size={16} /> Verified by patient</span>
                : <button onClick={() => verify(idx, ext.id)} disabled={verifying === idx}
                    className="px-5 py-2.5 bg-gradient-to-r from-success-500 to-success-600 text-white rounded-xl text-sm font-medium hover:from-success-600 hover:to-success-700 disabled:opacity-50 shadow-md shadow-success-200 transition-all flex items-center gap-2">
                    {verifying === idx ? 'Verifying...' : 'Verify this document'}
                  </button>}
            </div>
          </div>
        ))}

        <button onClick={() => navigate('/kiosk/review')}
          className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-4 rounded-2xl font-bold text-lg shadow-md shadow-primary-200 transition-all hover:shadow-lg flex items-center justify-center gap-2">
          {extractions.length === 0 ? 'Skip & Continue' : 'Continue'}
          <ArrowRight size={20} />
        </button>
      </div>
    </KioskShell>
  );
}
