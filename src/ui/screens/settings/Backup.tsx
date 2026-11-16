import { useRef, useState } from 'react';
import { useI18n } from '../../../i18n';
import { useSettings } from '../../settingsContext';
import { Header } from '../../components/Layout';
import { updateSettings } from '../../../data/repo';
import {
  BackupError, backupFileName, exportBackup, readBackup, restoreBackup, shareOrDownload,
} from '../../../services/backup';

export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} Ko`;
  return `${(n / 1024 / 1024).toFixed(1)} Mo`;
}

export function Backup() {
  const { t, lang } = useI18n();
  const s = useSettings();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();

  const doExport = async () => {
    setBusy(true);
    setMsg(undefined);
    try {
      const { bytes } = await exportBackup();
      const r = await shareOrDownload(bytes, backupFileName(), 'application/zip');
      if (r !== 'cancelled') {
        await updateSettings({ lastBackupAt: new Date().toISOString() });
        setMsg({ ok: true, text: t('backup.exportDone', { size: formatBytes(bytes.length) }) });
      }
    } catch {
      setMsg({ ok: false, text: t('backup.error') });
    } finally {
      setBusy(false);
    }
  };

  const doImport = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setMsg(undefined);
    try {
      const parsed = await readBackup(file);
      const date = new Date(parsed.manifest.exportedAt).toLocaleString(lang);
      const ok = confirm(t('backup.importConfirm', {
        date, audits: parsed.manifest.counts.audits ?? 0, photos: parsed.manifest.counts.photos ?? 0,
      }));
      if (ok) {
        await restoreBackup(parsed);
        setMsg({ ok: true, text: t('backup.importDone') });
      }
    } catch (e) {
      const code = e instanceof BackupError ? e.code : 'invalid';
      setMsg({ ok: false, text: t(code === 'tooNew' ? 'backup.tooNew' : 'backup.invalid') });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <>
      <Header title={t('settings.backup')} back />
      <section className="card">
        <p className="small muted">
          {s.lastBackupAt ? t('backup.last', { date: new Date(s.lastBackupAt).toLocaleString(lang) }) : t('backup.never')}
        </p>
        <button type="button" className="btn btn-primary btn-big" disabled={busy} onClick={doExport}>
          ⬆️ {busy ? t('backup.working') : t('backup.export')}
        </button>
        <p className="small muted">{t('backup.exportHint')}</p>
      </section>
      <section className="card">
        <button type="button" className="btn btn-big" disabled={busy} onClick={() => input.current?.click()}>
          ⬇️ {t('backup.import')}
        </button>
        <p className="small warn">{t('backup.importHint')}</p>
        <input ref={input} type="file" accept=".zip,application/zip" hidden onChange={(e) => doImport(e.target.files?.[0])} />
      </section>
      {msg && <section className={`card ${msg.ok ? 'success' : 'error'}`}>{msg.text}</section>}
    </>
  );
}
