// Modèle de données de l'application d'audit 5S.
// Ce fichier n'a aucune dépendance : il peut être réutilisé tel quel
// pour une future migration (synchronisation, Microsoft 365...).

export type ID = string;
/** Date locale au format 'YYYY-MM-DD' */
export type ISODate = string;
/** Date-heure ISO 8601 complète */
export type ISODateTime = string;

export type Lang = 'fr' | 'en' | 'de';
export type ReportLang = 'en' | 'de';
export const LANGS: Lang[] = ['fr', 'en', 'de'];

/** Libellé traduit. Repli : langue demandée → en → fr → de */
export type Localized = Partial<Record<Lang, string>>;

export type SKey = 'seiri' | 'seiton' | 'seiso' | 'seiketsu' | 'shitsuke';
export const S_KEYS: SKey[] = ['seiri', 'seiton', 'seiso', 'seiketsu', 'shitsuke'];

// ---------- Réglages ----------

export interface Settings {
  id: 'singleton';
  siteName: string;
  /** Auditeur principal (jamais un opérateur) */
  auditorName: string;
  /** Participants habituels au 5S walk (auditeurs, managers — jamais d'opérateurs) */
  defaultParticipants: string[];
  /** Mention imprimée en haut de chaque page du rapport, ex. « 1 - General Business » */
  classificationLabel: string;
  uiLang: Lang;
  reportLang: ReportLang;
  /** Nombre d'audits consécutifs avec la même catégorie sur un poste avant alerte */
  recurrenceThreshold: number;
  defaultActionDueDays: number;
  defaultActionOwner: string;
  /** 0 = toutes les photos */
  reportPhotosPerFinding: number;
  lastBackupAt?: ISODateTime;
}

export interface ChecklistQuestion {
  id: ID;
  text: Localized;
  s: SKey;
}

export interface Workbench {
  id: ID;
  name: string;
  zone: string;
  referencePhotoId?: ID;
  checklist: ChecklistQuestion[];
  /** false = archivé (historique conservé) */
  active: boolean;
  order: number;
}

export interface Category {
  id: ID;
  label: Localized;
  s: SKey;
  /** Gravité proposée par défaut à la saisie d'un constat */
  defaultSeverityId?: ID;
  active: boolean;
  order: number;
}

export interface SeverityLevel {
  id: ID;
  code: string;
  label: Localized;
  color: string;
  /** Plus grand = plus grave */
  rank: number;
}

// ---------- Audit ----------

export type AuditStatus = 'in_progress' | 'closed';

export interface Audit {
  id: ID;
  isoYear: number;
  isoWeek: number;
  date: ISODate;
  startedAt: ISODateTime;
  closedAt?: ISODateTime;
  status: AuditStatus;
  /** Copies figées au moment de l'audit */
  auditorName: string;
  participants: string[];
}

export type WorkbenchAuditStatus = 'todo' | 'in_progress' | 'done';

export interface ChecklistAnswer {
  questionId: ID;
  text: Localized;
  s: SKey;
  answer: 'yes' | 'no';
}

export interface WorkbenchAudit {
  id: ID;
  auditId: ID;
  workbenchId: ID;
  startedAt?: ISODateTime;
  completedAt?: ISODateTime;
  status: WorkbenchAuditStatus;
  /** « Conforme, rien à signaler » */
  markedCompliant: boolean;
  answers: ChecklistAnswer[];
  /** 0 à 100 */
  scorePct?: number;
}

/** Écart au standard, ou piste d'amélioration (hors score / Pareto / récurrences) */
export type FindingType = 'deviation' | 'improvement';

export interface Finding {
  id: ID;
  type: FindingType;
  auditId: ID;
  workbenchAuditId: ID;
  workbenchId: ID;
  categoryId?: ID; // obligatoire pour un écart, facultatif pour une amélioration
  severityId?: ID;
  /** Sert de légende sous les photos dans le rapport */
  comment?: string;
  photoIds: ID[];
  createdAt: ISODateTime;
  /** Renseigné quand l'écart d'un audit précédent est « toujours présent » */
  recurrenceOfFindingId?: ID;
}

// ---------- Actions ----------

export type ActionStatus = 'open' | 'in_progress' | 'closed';

export interface Action {
  id: ID;
  findingId: ID;
  workbenchId: ID;
  categoryId?: ID;
  /** Fonction ou manager — jamais un opérateur */
  owner: string;
  dueDate: ISODate;
  status: ActionStatus;
  createdAt: ISODateTime;
  closedAt?: ISODateTime;
  afterPhotoIds: ID[];
  closingComment?: string;
  /** Nombre d'audits où l'écart était toujours présent */
  recurrenceCount: number;
}

export interface ProblemSolving {
  id: ID;
  workbenchId: ID;
  categoryId: ID;
  openedAt: ISODateTime;
  /** Numéro ou lien du 9-step mené hors de l'application */
  reference?: string;
  status: 'open' | 'closed';
}

export type PhotoKind = 'finding' | 'after' | 'reference';

export interface Photo {
  id: ID;
  kind: PhotoKind;
  blob: Blob;
  thumb: Blob;
  width: number;
  height: number;
  takenAt: ISODateTime;
}

// ---------- Sauvegarde ----------

export interface BackupManifest {
  app: '5s-audit';
  schemaVersion: number;
  exportedAt: ISODateTime;
  counts: Record<string, number>;
}
