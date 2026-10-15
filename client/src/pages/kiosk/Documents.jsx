import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
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
    <div className={`flex items-center justify-between p-2 rounded-lg text-sm ${outOfRange ? 'bg-amber-50' : 'bg-gray-50'}`}>
      <span className="font-medium">{lab.name}</span>
      <span>{lab.value} {lab.unit}</span>
      <span className="text-xs text-gray-500">Ref: {lab.referenceRange}</span>
      {outOfRange
        ? <span className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle size={12} /> Outside range</span>
        : <span className="text-xs text-teal-600 flex items-center gap-1"><CheckCircle size={12} /> Normal</span>}
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
      const fd = new FormData();
      fd.append('file', file);
      fd.append('session_id', kiosk.sessionId);
      const r = await api.post('/documents/extract', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setExtractions(p => [...p, { ...r.data, id: r.data.id, verified: false, fileName: file.name }]);
    } catch { setError('Upload failed. Please try again.'); }
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

  return (
    <KioskShell step="Documents" backTo="/kiosk/interview">
      <div className="w-full mt-4 flex flex-col gap-5">
        <h1 className="text-2xl font-bold text-gray-800">{t('documents_title')}</h1>
        <p className="text-gray-500 text-sm">{t('documents_hint')}</p>

        <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 cursor-pointer transition
          ${uploading ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}>
          <Upload size={36} className="text-blue-400 mb-2" />
          <p className="font-medium text-gray-700">{uploading ? 'Uploading...' : 'Tap to upload document'}</p>
          <p className="text-xs text-gray-400 mt-1">JPG, PNG, PDF · Max 5MB</p>
          <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={upload} className="hidden" disabled={uploading} />
        </label>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {extractions.map((ext, idx) => (
          <div key={idx} className="bg-white border rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-blue-500" />
                <span className="font-semibold text-gray-800">{ext.fileName}</span>
              </div>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{ext.docType}</span>
            </div>
            {ext.date && <p className="text-sm text-gray-500">Date: {ext.date} · Provider: {ext.provider}</p>}

            {ext.labs?.length > 0 && (
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Lab Results</p>
                {ext.labs.map((lab, i) => <LabRow key={i} lab={lab} />)}
              </div>
            )}
            {ext.medications?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Medications</p>
                {ext.medications.map((m, i) => (
                  <p key={i} className="text-sm text-gray-700">{m.name} {m.dose} — {m.frequency}</p>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-xs text-gray-400">Confidence: {Math.round((ext.confidence || 0) * 100)}%</span>
              {ext.verified
                ? <span className="flex items-center gap-1 text-teal-600 text-sm font-medium"><CheckCircle size={16} /> Verified by patient</span>
                : <button onClick={() => verify(idx, ext.id)} disabled={verifying === idx}
                    className="px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 disabled:opacity-50">
                    {verifying === idx ? 'Verifying...' : 'Verify this document'}
                  </button>}
            </div>
          </div>
        ))}

        <button onClick={() => navigate('/kiosk/review')}
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 mt-2">
          {extractions.length === 0 ? 'Skip & Continue →' : 'Continue →'}
        </button>
      </div>
    </KioskShell>
  );
}
