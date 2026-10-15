import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

export default function DemoBanner() {
  const { t } = useTranslation();
  return (
    <div className="w-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-amber-900 text-center py-2 px-4 text-sm font-semibold tracking-wide z-50 flex items-center justify-center gap-2 shadow-sm">
      <AlertTriangle size={16} className="flex-shrink-0" />
      <span>{t('demo_banner')}</span>
    </div>
  );
}
