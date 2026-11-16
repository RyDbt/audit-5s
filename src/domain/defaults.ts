// Valeurs proposées au premier lancement. Tout est modifiable dans les Réglages.
import type { Category, ChecklistQuestion, SeverityLevel, Settings, Workbench } from './types';

export const DEFAULT_SETTINGS: Settings = {
  id: 'singleton',
  siteName: '',
  auditorName: '',
  defaultParticipants: [],
  classificationLabel: '',
  uiLang: 'fr',
  reportLang: 'en',
  recurrenceThreshold: 3,
  defaultActionDueDays: 7,
  defaultActionOwner: 'Team leader',
  reportPhotosPerFinding: 0,
};

export const DEFAULT_SEVERITIES: SeverityLevel[] = [
  { id: 'sev-minor', code: 'minor', rank: 1, color: '#64748b', label: { fr: 'Mineur', en: 'Minor', de: 'Gering' } },
  { id: 'sev-quality', code: 'quality', rank: 2, color: '#d97706', label: { fr: 'Qualité', en: 'Quality', de: 'Qualität' } },
  { id: 'sev-esd', code: 'esd', rank: 3, color: '#7c3aed', label: { fr: 'ESD', en: 'ESD', de: 'ESD' } },
  { id: 'sev-safety', code: 'safety', rank: 4, color: '#dc2626', label: { fr: 'Sécurité', en: 'Safety', de: 'Sicherheit' } },
];

type CatSeed = Omit<Category, 'active' | 'order'>;

const CATEGORY_SEEDS: CatSeed[] = [
  { id: 'cat-ppe', s: 'seiton', defaultSeverityId: 'sev-minor',
    label: { fr: 'EPI non rangés', en: 'PPE not stored', de: 'PSA nicht verstaut' } },
  { id: 'cat-tool-missing', s: 'seiton', defaultSeverityId: 'sev-quality',
    label: { fr: 'Outil manquant ou mal rangé', en: 'Missing or misplaced tool', de: 'Werkzeug fehlt oder falsch abgelegt' } },
  { id: 'cat-tool-nonstd', s: 'seiri', defaultSeverityId: 'sev-quality',
    label: { fr: 'Outil non standard', en: 'Non-standard tool', de: 'Nicht-Standard-Werkzeug' } },
  { id: 'cat-dirt', s: 'seiso', defaultSeverityId: 'sev-minor',
    label: { fr: 'Poussière / saleté', en: 'Dust / dirt', de: 'Staub / Schmutz' } },
  { id: 'cat-personal', s: 'seiri', defaultSeverityId: 'sev-minor',
    label: { fr: 'Affaires personnelles', en: 'Personal belongings', de: 'Persönliche Gegenstände' } },
  { id: 'cat-unprotected', s: 'shitsuke', defaultSeverityId: 'sev-quality',
    label: { fr: 'Écran ou pièce non protégé', en: 'Display or part left unprotected', de: 'Display oder Teil ungeschützt' } },
  { id: 'cat-waste', s: 'seiso', defaultSeverityId: 'sev-minor',
    label: { fr: 'Déchets / emballages', en: 'Waste / packaging', de: 'Abfall / Verpackung' } },
  { id: 'cat-marking', s: 'seiton', defaultSeverityId: 'sev-minor',
    label: { fr: 'Marquage ou emplacements non respectés', en: 'Floor marking or locations not respected', de: 'Markierung oder Stellplätze nicht eingehalten' } },
  { id: 'cat-docs', s: 'seiketsu', defaultSeverityId: 'sev-quality',
    label: { fr: 'Documents / instructions absents ou abîmés', en: 'Documents / instructions missing or damaged', de: 'Dokumente / Anweisungen fehlen oder beschädigt' } },
  { id: 'cat-esd', s: 'shitsuke', defaultSeverityId: 'sev-esd',
    label: { fr: 'Matériel ESD non conforme', en: 'Non-compliant ESD equipment', de: 'ESD-Ausrüstung nicht konform' } },
  // Catégories ajoutées d'après le rapport 5S walk existant
  { id: 'cat-chemical', s: 'shitsuke', defaultSeverityId: 'sev-safety',
    label: { fr: 'Colle ou produit chimique non fermé', en: 'Uncapped glue or chemical', de: 'Kleber oder Chemikalie nicht verschlossen' } },
  { id: 'cat-mixed', s: 'seiton', defaultSeverityId: 'sev-quality',
    label: { fr: 'Visserie ou pièces mélangées', en: 'Mixed fasteners or parts', de: 'Gemischte Schrauben oder Teile' } },
  { id: 'cat-unneeded', s: 'seiri', defaultSeverityId: 'sev-minor',
    label: { fr: 'Matériel inutile ou non utilisé', en: 'Unneeded or unused equipment', de: 'Unnötiges oder ungenutztes Material' } },
  { id: 'cat-unorganized', s: 'seiton', defaultSeverityId: 'sev-minor',
    label: { fr: 'Bac ou tiroir désorganisé', en: 'Unorganized box or drawer', de: 'Unordentliche Box oder Schublade' } },
];

export const DEFAULT_CATEGORIES: Category[] = CATEGORY_SEEDS.map((c, i) => ({ ...c, active: true, order: i }));

export const DEFAULT_CHECKLIST: ChecklistQuestion[] = [
  { id: 'q-seiri-1', s: 'seiri', text: {
    fr: 'Seuls les outils et matériels nécessaires sont présents sur le poste',
    en: 'Only necessary tools and materials are at the workstation',
    de: 'Nur notwendige Werkzeuge und Materialien befinden sich am Arbeitsplatz' } },
  { id: 'q-seiri-2', s: 'seiri', text: {
    fr: 'Aucune affaire personnelle sur le poste',
    en: 'No personal belongings at the workstation',
    de: 'Keine persönlichen Gegenstände am Arbeitsplatz' } },
  { id: 'q-seiton-1', s: 'seiton', text: {
    fr: 'Chaque outil est à son emplacement identifié',
    en: 'Every tool is in its marked location',
    de: 'Jedes Werkzeug befindet sich an seinem gekennzeichneten Platz' } },
  { id: 'q-seiton-2', s: 'seiton', text: {
    fr: 'Les EPI sont rangés à leur emplacement',
    en: 'PPE is stored in its location',
    de: 'PSA ist an ihrem Platz verstaut' } },
  { id: 'q-seiso-1', s: 'seiso', text: {
    fr: 'Établi et sol propres, sans poussière ni déchets',
    en: 'Workbench and floor clean, no dust or waste',
    de: 'Werkbank und Boden sauber, ohne Staub und Abfall' } },
  { id: 'q-seiketsu-1', s: 'seiketsu', text: {
    fr: 'Instructions de travail présentes, à jour et lisibles',
    en: 'Work instructions present, up to date and legible',
    de: 'Arbeitsanweisungen vorhanden, aktuell und lesbar' } },
  { id: 'q-seiketsu-2', s: 'seiketsu', text: {
    fr: 'Matériel ESD conforme (tapis, bracelet, mise à la terre)',
    en: 'ESD equipment compliant (mat, wrist strap, grounding)',
    de: 'ESD-Ausrüstung in Ordnung (Matte, Armband, Erdung)' } },
  { id: 'q-shitsuke-1', s: 'shitsuke', text: {
    fr: 'Écrans et pièces en cours protégés et capots fermés',
    en: 'Displays and work-in-progress parts protected, containers closed',
    de: 'Displays und Teile in Arbeit geschützt, Behälter verschlossen' } },
];

export function defaultWorkbenches(count = 12): Workbench[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `wb-${i + 1}`,
    name: `Line ${i + 1}`,
    zone: '',
    checklist: DEFAULT_CHECKLIST.map((q) => ({ ...q, text: { ...q.text } })),
    active: true,
    order: i,
  }));
}
