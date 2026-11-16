import { useEffect, useState, type ReactNode } from 'react';

/** Champ texte qui enregistre à la sortie du champ (pas d'écriture à chaque touche). */
export function TextField(props: {
  label?: ReactNode;
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  hint?: ReactNode;
  multiline?: boolean;
  inputMode?: 'text' | 'numeric';
}) {
  const [v, setV] = useState(props.value);
  useEffect(() => setV(props.value), [props.value]);
  const commit = () => {
    if (v !== props.value) props.onCommit(v);
  };
  const common = {
    value: v,
    placeholder: props.placeholder,
    onChange: (e: { target: { value: string } }) => setV(e.target.value),
    onBlur: commit,
  };
  return (
    <label className="field">
      {props.label && <span className="field-label">{props.label}</span>}
      {props.multiline ? (
        <textarea rows={3} {...common} />
      ) : (
        <input
          type="text"
          inputMode={props.inputMode}
          enterKeyHint="done"
          {...common}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      )}
      {props.hint && <span className="field-hint">{props.hint}</span>}
    </label>
  );
}

export function NumberField(props: {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  onCommit: (v: number) => void;
}) {
  const set = (n: number) => props.onCommit(Math.min(props.max, Math.max(props.min, n)));
  return (
    <div className="field">
      <span className="field-label">{props.label}</span>
      <div className="stepper">
        <button type="button" className="btn" onClick={() => set(props.value - 1)} aria-label="-">−</button>
        <span className="stepper-value">{props.value}</span>
        <button type="button" className="btn" onClick={() => set(props.value + 1)} aria-label="+">+</button>
      </div>
    </div>
  );
}

export function SelectField<T extends string>(props: {
  label: ReactNode;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <label className="field">
      <span className="field-label">{props.label}</span>
      <select value={props.value} onChange={(e) => props.onChange(e.target.value as T)}>
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
