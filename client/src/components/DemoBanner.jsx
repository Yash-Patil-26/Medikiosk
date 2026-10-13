import { useTranslation } from 'react-i18next';

export default function DemoBanner() {
  const { t } = useTranslation();
  return (
    <div className="w-full bg-amber-400 text-amber-900 text-center py-1.5 text-sm font-bold tracking-wide z-50">
      {t('demo_banner')}
    </div>
  );
}
