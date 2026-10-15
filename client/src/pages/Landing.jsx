import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Activity, Mic, FileText, ClipboardList, Shield, Database, Bell, FileJson, Building2, Trash2, BookOpen, ArrowRight, CheckCircle, Users, Clock, HeartPulse } from 'lucide-react';
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

  const STATS = [
    { icon: Users, value: '90%', label: 'Time Saved' },
    { icon: Clock, value: '2min', label: 'Avg. Intake' },
    { icon: HeartPulse, value: '100%', label: 'Privacy First' },
    { icon: CheckCircle, value: 'HIPAA', label: 'Compliant' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/20 flex flex-col">
      <DemoBanner />
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md">
            <Activity size={20} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-gray-800 text-lg leading-tight">MediKiosk</span>
            <span className="text-xs text-gray-500 font-medium block">Clinical Intake System</span>
          </div>
        </div>
        <button onClick={() => navigate('/login')}
          className="px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium hover:from-primary-600 hover:to-primary-700 shadow-md transition-all flex items-center gap-2">
          {t('staff_login')}
          <ArrowRight size={16} />
        </button>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-50/50 via-transparent to-transparent" />
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white border border-primary-200 text-primary-700 px-5 py-2 rounded-full text-sm font-semibold mb-8 shadow-sm animate-slide-down">
            <Activity size={16} />
            <span>AI-Assisted Pre-Consultation System</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
            {t('app_name')}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-4 leading-relaxed">
            {t('hero_subtitle')}
          </p>
          <p className="text-gray-500 max-w-xl mx-auto mb-10">
            {t('hero_desc')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate('/kiosk/identify')}
              className="px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-2xl text-lg font-bold shadow-lg shadow-primary-200 transition-all hover:shadow-xl hover:shadow-primary-300 flex items-center justify-center gap-2">
              {t('start_kiosk')}
              <ArrowRight size={20} />
            </button>
            <button onClick={() => navigate('/login')}
              className="px-8 py-4 bg-white border-2 border-gray-200 text-gray-700 hover:border-primary-300 hover:text-primary-600 rounded-2xl text-lg font-bold transition-all shadow-sm hover:shadow-md">
              {t('staff_login')}
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 py-16 bg-white/50 backdrop-blur-sm border-y border-gray-200/50">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center mb-3">
                  <stat.icon size={28} className="text-primary-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 max-w-6xl mx-auto w-full">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">{t('how_it_works')}</h2>
          <p className="text-gray-500 max-w-xl mx-auto">A streamlined patient intake process designed for efficiency and accuracy</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
          {HOW_IT_WORKS.map((s, i) => (
            <div key={s.n} className="flex flex-col items-center text-center gap-3 group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-primary-200 group-hover:scale-110 transition-transform">
                {s.n}
              </div>
              <p className="font-semibold text-gray-800 text-sm">{s.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-gradient-to-b from-gray-50 to-white px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">{t('key_features')}</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Enterprise-grade features built for modern healthcare facilities</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="card card-hover p-6 flex flex-col gap-3 group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <f.icon size={24} className="text-primary-600" />
                </div>
                <p className="font-semibold text-gray-800">{f.title}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl p-12 text-center text-white shadow-2xl shadow-primary-200">
            <h2 className="text-3xl font-bold mb-4">Ready to Transform Patient Intake?</h2>
            <p className="text-primary-100 mb-8 max-w-xl mx-auto">Join healthcare facilities already using MediKiosk to streamline their clinical workflows.</p>
            <button onClick={() => navigate('/kiosk/identify')}
              className="px-8 py-4 bg-white text-primary-600 rounded-2xl text-lg font-bold hover:bg-gray-50 transition-all shadow-lg inline-flex items-center gap-2">
              Get Started
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      <footer className="bg-white border-t border-gray-200 px-6 py-8 text-center">
        <p className="text-xs text-gray-400">{t('footer_disclaimer')}</p>
      </footer>
    </div>
  );
}
