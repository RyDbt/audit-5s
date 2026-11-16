import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../data/db';
import type { Photo, PhotoKind } from '../../domain/types';
import { compressPhoto } from '../../services/photo';
import { useI18n } from '../../i18n';

/** URL temporaire d'un Blob, libérée automatiquement. */
export function useObjectUrl(blob: Blob | undefined): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) return setUrl(undefined);
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

export function PhotoView({ id, thumb, className }: { id: string; thumb?: boolean; className?: string }) {
  const photo = useLiveQuery(() => db.photos.get(id), [id]);
  const url = useObjectUrl(photo ? (thumb ? photo.thumb : photo.blob) : undefined);
  if (!url) return <div className={`photo-placeholder ${className ?? ''}`} />;
  return <img src={url} alt="" className={className} />;
}

/**
 * Bouton qui ouvre directement l'appareil photo du téléphone,
 * compresse l'image et l'enregistre. Rappel « pas de visages » toujours visible.
 */
export function PhotoCaptureButton(props: {
  kind: PhotoKind;
  label: string;
  onSaved: (photo: Photo) => void | Promise<void>;
  className?: string;
}) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(false);
    try {
      const photo = await compressPhoto(file, props.kind);
      await db.photos.add(photo);
      await props.onSaved(photo);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="photo-capture">
      <div className="no-faces" role="note">🚫👤 {t('photo.noFaces')}</div>
      <button type="button" className={`btn btn-primary btn-big ${props.className ?? ''}`} disabled={busy}
        onClick={() => input.current?.click()}>
        📷 {busy ? t('photo.processing') : props.label}
      </button>
      {error && <div className="error">{t('photo.error')}</div>}
      <input ref={input} type="file" accept="image/*" capture="environment" hidden
        onChange={(e) => onFile(e.target.files?.[0])} />
    </div>
  );
}
