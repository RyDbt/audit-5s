import { LANGS, type Lang, type Localized } from '../../domain/types';
import { useI18n } from '../../i18n';
import { TextField } from './fields';

/**
 * Libellé multilingue : champ principal dans la langue de l'application,
 * les deux autres langues dans un volet repliable (utilisées pour le rapport).
 */
export function LocalizedField(props: {
  label?: string;
  value: Localized;
  placeholder?: string;
  multiline?: boolean;
  onCommit: (v: Localized) => void;
}) {
  const { lang, t } = useI18n();
  const others = LANGS.filter((l) => l !== lang);
  const set = (l: Lang, text: string) => props.onCommit({ ...props.value, [l]: text.trim() });
  const missing = others.filter((l) => !props.value[l]?.trim());
  return (
    <div className="localized">
      <TextField label={props.label} value={props.value[lang] ?? ''} placeholder={props.placeholder}
        multiline={props.multiline} onCommit={(v) => set(lang, v)} />
      <details>
        <summary className="small muted">
          {others.map((l) => l.toUpperCase()).join(' / ')}
          {missing.length > 0 && <span className="warn"> ⚠ {missing.map((l) => l.toUpperCase()).join(', ')}</span>}
        </summary>
        {others.map((l) => (
          <TextField key={l} label={t(`lang.${l}`)} value={props.value[l] ?? ''} multiline={props.multiline} onCommit={(v) => set(l, v)} />
        ))}
      </details>
    </div>
  );
}
