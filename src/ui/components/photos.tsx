import { useEffect, useRef, useState, type ReactNode } from 'react';
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

export function PhotoView({ id, thumb, className, onClick }: { id: string; thumb?: boolean; className?: string; onClick?: () => void }) {
  const photo = useLiveQuery(() => db.photos.get(id), [id]);
  const url = useObjectUrl(photo ? (thumb ? photo.thumb : photo.blob) : undefined);
  if (!url) return <div className={`photo-placeholder ${className ?? ''}`} />;
  return <img src={url} alt="" className={className} onClick={onClick} />;
}

/** Photo plein écran, fermée d'un appui. */
export function PhotoZoom({ id, onClose }: { id: string; onClose: () => void }) {
  return (
    <div className="zoom" onClick={onClose} role="dialog">
      <PhotoView id={id} className="zoom-img" />
    </div>
  );
}

/**
 * Appareil photo du téléphone : `open()` doit être appelé directement dans un appui
 * (règle des navigateurs). La photo est compressée puis enregistrée.
 */
export function useCamera(kind: PhotoKind, onSaved: (photo: Photo) => void | Promise<void>) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const saved = useRef(onSaved);
  saved.current = onSaved;

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(false);
    try {
      const photo = await compressPhoto(file, kind);
      await db.photos.add(photo);
      await saved.current(photo);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const element: ReactNode = (
    <input ref={input} type="file" accept="image/*" capture="environment" hidden
      data-camera={kind} onChange={(e) => onFile(e.target.files?.[0])} />
  );
  return { open: () => input.current?.click(), busy, error, element };
}

export function NoFacesReminder() {
  const { t } = useI18n();
  return <div className="no-faces" role="note">🚫👤 {t('photo.noFaces')}</div>;
}

/** Bouton qui ouvre l'appareil photo, avec le rappel « pas de visages » toujours visible. */
export function PhotoCaptureButton(props: {
  kind: PhotoKind;
  label: string;
  onSaved: (photo: Photo) => void | Promise<void>;
  className?: string;
}) {
  const { t } = useI18n();
  const cam = useCamera(props.kind, props.onSaved);
  return (
    <div className="photo-capture">
      <NoFacesReminder />
      <button type="button" className={`btn btn-primary btn-big ${props.className ?? ''}`} disabled={cam.busy}
        onClick={cam.open}>
        📷 {cam.busy ? t('photo.processing') : props.label}
      </button>
      {cam.error && <div className="error">{t('photo.error')}</div>}
      {cam.element}
    </div>
  );
}
