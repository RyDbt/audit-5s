# Audit 5S

Application d'audit 5S hebdomadaire pour postes d'assemblage manuel, conçue pour le téléphone.

- **Installable (PWA)** et **utilisable sans réseau** dans l'atelier.
- **Toutes les données restent sur le téléphone** (IndexedDB). Aucun serveur, aucun cloud, aucune donnée envoyée à l'extérieur. Le site GitHub Pages ne sert qu'à télécharger l'application (le code), jamais les données.
- Interface en français, anglais et allemand.
- L'outil audite des **postes**, jamais des personnes : aucun nom d'opérateur.

> ⚠️ Ne déposez jamais de rapports, photos ou données réelles dans ce dépôt.

## Avancement

| Phase | Contenu | État |
|---|---|---|
| 0 | Socle, mode hors ligne, installation, Réglages | ✅ |
| 1 | Audit (constats, photos, checklist, score) + sauvegarde | ✅ |
| 2 | Suivi des actions, récurrences, données de démonstration | ⏳ |
| 3 | Rapport PDF (EN / DE) + version une page | ⏳ |
| 4 | Tableau de bord de tendance + export Excel / CSV | ⏳ |
| 5 | Finitions | ⏳ |

## Installer sur un téléphone Android (Chrome)

1. Ouvrir **Chrome** sur le téléphone et aller sur `https://rydbt.github.io/audit-5s/`.
2. Menu **⋮** → **Ajouter à l'écran d'accueil** → **Installer**.
3. Ouvrir l'application depuis l'icône **Audit 5S**. Elle fonctionne ensuite en mode avion.

Les mises à jour s'installent automatiquement à la prochaine ouverture avec du réseau (fermer puis rouvrir l'application si nécessaire).

## Paramétrage (écran Réglages)

- **Général** : site, auditeur, participants habituels, mention de classification, langues de l'application et du rapport, seuil d'alerte de récurrence, responsable et échéance par défaut des actions, nombre de photos par constat dans le rapport.
- **Établis** : nom, zone, photo standard de référence, checklist de score (oui / non), avec copie vers tous les établis. Un établi déjà audité n'est jamais supprimé, il est archivé.
- **Catégories d'écarts** : libellés FR / EN / DE (EN et DE servent au rapport), S rattaché, gravité proposée. Une catégorie déjà utilisée est désactivée plutôt que supprimée.
- **Niveaux de gravité** : libellé et couleur.

Valeurs par défaut : 12 postes (« Line 1 » à « Line 12 »), 14 catégories, 4 gravités (mineur, qualité, ESD, sécurité), 8 questions couvrant les 5 S.

## Faire l'audit

1. Onglet **Audit** → **Démarrer l'audit** : la semaine ISO et la date sont automatiques. Un seul audit par semaine ; s'il existe déjà, il est repris.
2. Choisir un établi. La photo standard de référence s'affiche en haut (appui = plein écran).
3. **📷 + Constat** ouvre directement l'appareil photo. Ensuite : autres photos si besoin, catégorie (la gravité proposée se remplit seule), commentaire facultatif (il sert de légende dans le rapport), **Enregistrer**. Le bouton **✎** crée un constat sans photo.
   - **Écart** : compte dans le score, le Pareto et les récurrences.
   - **Amélioration** : piste d'amélioration (section à part dans le rapport), crée aussi une action.
4. Répondre à la checklist (Oui / Non). **Le reste = Oui** complète d'un coup.
5. **Terminer → établi suivant**, ou **Conforme, rien à signaler** (100 %, possible seulement sans écart).
6. Quand tout est fait : **Clôturer l'audit**. Un audit clôturé peut être rouvert.

Chaque constat crée une action (responsable et échéance par défaut, modifiables en phase 2). Le temps d'audit est mesuré du démarrage à la clôture ; le temps par établi est affiché sur sa fiche.

## Sauvegarde et restauration

**Réglages → Sauvegarde**.

- **Exporter une sauvegarde** crée un fichier `.zip` avec toutes les données et toutes les photos, puis ouvre le menu de partage Android (e-mail, OneDrive, Teams, Fichiers…). Faites-le après chaque audit.
- **Restaurer une sauvegarde** remplace **toutes** les données du téléphone par celles du fichier (changement de téléphone, retour en arrière). Une confirmation indique la date et le contenu de la sauvegarde.

Le fichier contient les photos d'atelier : rangez-le uniquement dans un espace de stockage approuvé par l'entreprise.

## Développement

Prérequis : Node.js 22.

```bash
npm install
npm run dev      # serveur de développement (accessible sur le réseau local)
npm test         # tests
npm run build    # version de production dans dist/
```

Stack : Vite, React, TypeScript, Dexie (IndexedDB), vite-plugin-pwa, Vitest.

Organisation du code :

```
src/domain/    types et logique pure (sans dépendance)
src/data/      base IndexedDB et accès aux données
src/services/  compression photo (puis PDF, exports)
src/i18n/      traductions fr / en / de
src/ui/        écrans et composants
```
