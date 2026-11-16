import { useI18n } from '../../../i18n';
import { useSettings } from '../../settingsContext';
import { updateSettings } from '../../../data/repo';
import { Header } from '../../components/Layout';
import { NumberField, SelectField, TextField } from '../../components/fields';
import type { Lang, ReportLang } from '../../../domain/types';

export function GeneralSettings() {
  const { t } = useI18n();
  const s = useSettings();
  const langs: { value: Lang; label: string }[] = [
    { value: 'fr', label: t('lang.fr') },
    { value: 'en', label: t('lang.en') },
    { value: 'de', label: t('lang.de') },
  ];
  const reportLangs = langs.filter((l) => l.value !== 'fr') as { value: ReportLang; label: string }[];

  return (
    <>
      <Header title={t('settings.general')} back />
      <section className="card form">
        <TextField label={t('settings.siteName')} value={s.siteName} onCommit={(v) => updateSettings({ siteName: v.trim() })} />
        <TextField label={t('settings.auditorName')} value={s.auditorName} onCommit={(v) => updateSettings({ auditorName: v.trim() })} />
        <TextField
          label={t('settings.participants')}
          hint={t('settings.participantsHint')}
          multiline
          value={s.defaultParticipants.join('\n')}
          onCommit={(v) => updateSettings({ defaultParticipants: v.split('\n').map((x) => x.trim()).filter(Boolean) })}
        />
        <TextField label={t('settings.classification')} value={s.classificationLabel}
          placeholder="1 - General Business"
          onCommit={(v) => updateSettings({ classificationLabel: v.trim() })} />
      </section>
      <section className="card form">
        <SelectField label={t('settings.uiLang')} value={s.uiLang} options={langs} onChange={(v) => updateSettings({ uiLang: v })} />
        <SelectField label={t('settings.reportLang')} value={s.reportLang} options={reportLangs} onChange={(v) => updateSettings({ reportLang: v })} />
      </section>
      <section className="card form">
        <NumberField label={t('settings.recurrenceThreshold')} value={s.recurrenceThreshold} min={2} max={10}
          onCommit={(v) => updateSettings({ recurrenceThreshold: v })} />
        <NumberField label={t('settings.actionDueDays')} value={s.defaultActionDueDays} min={1} max={60}
          onCommit={(v) => updateSettings({ defaultActionDueDays: v })} />
        <TextField label={t('settings.actionOwner')} hint={t('settings.actionOwnerHint')} value={s.defaultActionOwner}
          onCommit={(v) => updateSettings({ defaultActionOwner: v.trim() })} />
        <NumberField label={t('settings.reportPhotos')} value={s.reportPhotosPerFinding} min={0} max={12}
          onCommit={(v) => updateSettings({ reportPhotosPerFinding: v })} />
      </section>
    </>
  );
}
