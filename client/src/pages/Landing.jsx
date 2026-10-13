import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Activity, Mic, FileText, ClipboardList, Shield, Database, Bell, FileJson, Building2, Trash2, BookOpen } from 'lucide-react';
import DemoBanner from '../components/DemoBanner.jsx';

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const HOW_IT_WORKS = [
    { n: 1, title: t('step_identify'), desc: t('step_identify_desc') },
    { n: 2, title: t('step_consent'), desc: t('step_consent_desc') },
    { n: 3, title: t('step_converse'), desc: t('step_converse_desc') },
    { n: 4, title: t('step_scan'), desc: t('step_scan_desc') },
    { n: 5, title: t('step_review'), desc: t('step_review_desc') },
    { n: 6, title: t('step_summarize'), desc: t('step_summarize_desc') },
    { n: 7, title: t('step_consult'), desc: t('step_consult_desc') }
  ];

  const FEATURES = [
    { icon: Mic, title: t('feat_voice'), desc: t('feat_voice_desc') },
    { icon: ClipboardList, title: t('feat_interview'), desc: t('feat_interview_desc') },
    { icon: FileText, title: t('feat_docs'), desc: t('feat_docs_desc') },
    { icon: BookOpen, title: t('feat_summary'), desc: t('feat_summary_desc') },
    { icon: Bell, title: t('feat_redflag'), desc: t('feat_redflag_desc') },
    { icon: Shield, title: t('feat_doctor'), desc: t('feat_doctor_desc') },
    { icon: FileJson, title: t('feat_fhir'), desc: t('feat_fhir_desc') },
    { icon: Building2, title: t('feat_his'), desc: t('feat_his_desc') },
    { icon: Database, title: t('feat_audit'), desc: t('feat_audit_desc') },
    { icon: Trash2, title: t('feat_purge'), desc: t('feat_purge_desc') }
  ];
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <DemoBanner />
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={28} className="text-blue-600" />
          <span className="text-xl font-bold text-blue-700">MediKiosk</span>
        </div>
        <button onClick={() => navigate('/login')}
          className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-medium">
          {t('staff_login')}
        </button>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-20 bg-gradient-to-b from-blue-50 to-white">
        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
          <Activity size={16} /> AI-Assisted Pre-Consultation System
        </div>
        <h1 className="text-5xl font-extrabold text-gray-900 mb-4">{t('app_name')}</h1>
        <p className="text-xl text-gray-600 max-w-xl mb-3">
          {t('hero_subtitle')}
        </p>
        <p className="text-gray-500 max-w-lg mb-10">
          {t('hero_desc')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button onClick={() => navigate('/kiosk/identify')}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-lg font-bold shadow-lg transition">
            {t('start_kiosk')}
          </button>
          <button onClick={() => navigate('/login')}
            className="px-8 py-4 bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 rounded-xl text-lg font-bold transition">
            {t('staff_login')}
          </button>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-16 max-w-5xl mx-auto w-full">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-10">{t('how_it_works')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
          {HOW_IT_WORKS.map(s => (
            <div key={s.n} className="flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">{s.n}</div>
              <p className="font-semibold text-gray-800 text-sm">{s.title}</p>
              <p className="text-xs text-gray-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-10">{t('key_features')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white rounded-xl p-5 shadow-sm border flex flex-col gap-2">
                <f.icon size={28} className="text-blue-600" />
                <p className="font-semibold text-gray-800">{f.title}</p>
                <p className="text-xs text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-white border-t px-6 py-6 text-center text-xs text-gray-400">
        {t('footer_disclaimer')}
      </footer>
    </div>
  );
}
