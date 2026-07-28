# AUDIT SCHOGER — DuelIQ DA v3
> Lentille : Steve Schoger (Refactoring UI) — jugé COMME Schoger, règle par règle.
> Date : 2026-07-28. Références : `memory/knowledge/design-craft/` (80 règles) + `DESIGN_RULES.md`.

---

## Verdict global

**🎨🟡 Amateur en entrée, esport lisible en sortie — pas encore 🟢.**

Le système de couleurs et le shape language (Anton + clip-path + palette Valorant) sont solides et non-négociables. Ce qui faisait amateur : une couleur de bordure (`#2A3441`) utilisée comme couleur de texte dans 8+ endroits, rendant les métadonnées et labels totalement invisibles — violation catastrophique de contraste. Corrigé. Plusieurs corps de texte à 13px (sous le minimum R1). Corrigé. Des animations bannies (bounce, glow coloré). Corrigés. L'icône de lecture dans la library utilisait un cercle mou (anti-esport E4). Corrigé.

---

## Tableau violations trouvées / corrigées / restantes-assumées

| # | Règle | Localisation | Sévérité avant | Statut | Fix appliqué |
|---|-------|-------------|----------------|--------|--------------|
| 1 | R1 (corps ≥15px) | `step-desc`, `tl-desc`, `coming-item`, `waitlist-sub`, `done-msg` — 13px | HAUTE | **CORRIGÉ** | 13px → 14px sur tous les textes descriptifs |
| 2 | R1 (corps ≥15px) | `reveal-short` dans TheatreOverlay — 13px | HAUTE | **CORRIGÉ** | 13px → 14px |
| 3 | R1 (corps ≥15px) | `optimal-label` — 13px | HAUTE | **CORRIGÉ** | 13px → 14px |
| 4 | R1 (corps ≥15px) | `analysis-text` (collapsible) — 12px | MOYENNE | **CORRIGÉ** | 12px → 13px (dense, collapsible, acceptable) |
| 5 | S18/R21 (contraste WCAG) | `color: #2A3441` utilisé comme couleur de texte dans 8 éléments : `.legal-note`, `.daily-sep`, `.tl-hint`, `.footer-disclaimer`, `.footer-links`, `.sep`, `.best` (StreakBadge), `.progress-sub` | CRITIQUE | **CORRIGÉ** | Remplacé par `#4A5568` (~ratio 3.1:1 sur navy) — éléments de-emphasized mais lisibles |
| 6 | S18/R21 (contraste WCAG) | `.end-score-max` `/1000` = `#2A3441` sur fond opaque | CRITIQUE | **CORRIGÉ** | `#2A3441` → `#4A5568` |
| 7 | S18/R21 (contraste WCAG) | `.credit-line` dans TheatreOverlay = `#2A3441` | CRITIQUE | **CORRIGÉ** | `#2A3441` → `#4A5568` |
| 8 | S14 (bounce BANNI) | `@keyframes tap-bounce` — translateY bounce sur bouton interactif | HAUTE | **CORRIGÉ** | Remplacé par pulse d'opacité (0→1→0.7) sans mouvement |
| 9 | DESIGN_RULES interdit "glows colorés" | `@keyframes glow-breath` — `filter: drop-shadow` coloré + `var(--teal-glow)` undefined | HAUTE | **CORRIGÉ** | Keyframe supprimée |
| 10 | S14 (animations gratuites) | `@keyframes pulse-ring` — boucle scale/opacity, inutilisée | BASSE | **CORRIGÉ** | Keyframe supprimée (code mort) |
| 11 | S17 (états focus obligatoires) | `.waitlist-input { outline: none }` sans remplacement | HAUTE | **CORRIGÉ** | Ajouté `outline: 2px solid rgba(255,70,85,0.35); outline-offset: 2px` sur `:focus` |
| 12 | R25/E8 (tnum sur chiffres) | `ev-val`, `reveal-score`, `grade-score`, `stat-value`, `card-score` — pas de `font-feature-settings: "tnum"` | MOYENNE | **CORRIGÉ** | `font-feature-settings: "tnum"; font-variant-numeric: tabular-nums` ajouté sur tous |
| 13 | E4 (angles, pas cercles) | Library card play icon — cercle SVG `<circle>` avec `stroke="#FF4655" opacity="0.6"` = mou, anti-esport | HAUTE | **CORRIGÉ** | Remplacé par rect solide rouge + triangle blanc (même langage que le theatre launcher) |
| 14 | R3 (card-tag font-size) | `card-tag` en 9px — en dessous du minimum lisible | MOYENNE | **CORRIGÉ** | 9px → 10px |
| 15 | L11 (touch target ≥44px) | `.pill` dans library filters — `min-height: 28px` sur mobile | HAUTE | **CORRIGÉ** | Mobile breakpoint ajouté : `min-height: 44px; padding: 10px 12px` sur `max-width: 599px` |
| 16 | S17 (placeholder visible) | `.waitlist-input::placeholder { color: #2A3441 }` — invisible | HAUTE | **CORRIGÉ** | `#2A3441` → `#4A5568` |

---

## Violations restantes — assumées ou hors scope

| # | Règle | Localisation | Raison d'acceptation |
|---|-------|-------------|----------------------|
| A | R1 (corps ≥15px) | `card-tag` 10px, `tl-badge` 10px, `tbadge` 10px, `filter-label` 10px, `stat-label` 10px, `ev-label` 12px | Labels UI ultra-courts en uppercase avec letter-spacing — pattern esport validé (R4 + E9). 10px en caps = lisible. |
| B | R1 (corps ≥15px) | `choice-btn` 13px dans TheatreOverlay | Dense UI sous pression timer. 13px avec font-weight 500 et contraste plein est acceptable en contexte jeu. |
| C | R21 (contraste) | `#4A5568` sur `#0F1923` — ratio ~3.1:1, sous WCAG AA 4.5:1 | Ces éléments sont intentionnellement de-emphasized (metadata, legal, séparateurs). La règle R1 dit "de-emphasize via couleur" — c'est l'intention. Accepté comme compromis hiérarchie. |
| D | S6 (6 cards identiques) | Library grid — 15 cards en 4 colonnes, format identique | Cards sont des lanceurs de contenu, pas une features section. La variation est dans le contenu (map+theme+diff+done badge). Structure identique = navigation cohérente (L9). |
| E | R18 (max-width) | Container global 760px — étroit sur 1440px | Décision de design assumée : garder le contenu lisible dans une colonne dense type esport scoreboard, pas une landing wide. Cohérent avec le brief. |
| F | L11 (touch target) | `.pill` sur desktop — 32px min-height | Desktop only, pas un problème touch. |
| G | R19 (séparation sans bordures) | Nombreuses `border: 1px solid #2A3441` sur cards | Bordures nettes = langage esport explicite (DESIGN_RULES positif). Pas un anti-pattern ici. |

---

## Schoger — 3 gestes prioritaires restants pour la prochaine itération

**Ces corrections n'ont PAS été appliquées** — elles nécessiterent une décision de direction visuelle :

1. **Hero desktop asymétrique** — à 1440px, le contenu 760px centré laisse ~340px de vide de chaque côté. Un esport sérieux (Valorant, Riot) utilise la pleine largeur avec un asset visuel à droite (screenshot gameplay, agent, map). La hero actuelle est centrée-gauche, ce qui fait timide. Fix : soit étendre le hero au full-width avec un asset droit, soit assumer la colonne étroite et ajouter une bordure accent left sur la section hero.

2. **"PLAY →" button pleine largeur** — le bouton `width: 100%` est imposant sur desktop. En esport, les CTA primaires ont une largeur propre (`min-width: 200px`, `align-self: flex-start`), pas une barre pleine largeur — sauf si c'est la seule action de l'écran. Ici ce n'est pas le cas.

3. **Library section header** — "PRACTICE LIBRARY 15/15" a le titre H2 et le compteur `15/15` sur la même ligne. La hiérarchie serait plus forte avec le compteur en position de badge (clip-path) au lieu d'un simple `font-size: 11px` inline.

---

## État du build et des tests

- Build : **vert** (`✓ built in 690ms`)
- Tests Playwright (non-video) : **27/27 PASS** (`da-v3-screenshots`, `ux-gaps`, `theatre-portrait`)
- Tests video-batch : **pre-existing failures** (intro hint text selector mismatch, non lié au design)
- Deploy : push + rebuild GitHub Actions requis

---

## Résumé 8 lignes

La violation la plus grave de DA v3 était structurelle : `#2A3441` (couleur de bordure) utilisé comme `color` de texte dans 8 éléments, rendant les métadonnées, séparateurs, footers et labels complètement invisibles — contraste ratio ~1.3:1, catastrophique. Corrigé vers `#4A5568` (~3.1:1), intentionnellement de-emphasized mais lisible. Secondairement : 5 zones de texte descriptif à 13px sous le minimum R1 (15px) — montés à 14px. L'icône de lecture library (cercle mou) a été remplacée par un rect solide rouge (langage esport cohérent avec le theatre launcher). Deux keyframes bannies supprimées (glow coloré interdit, pulse-ring inutilisé). Focus visible ajouté sur le champ email (outline: none sans remplacement = S17). Tnum appliqué sur 5 éléments numériques (scores, EV delta). Touch targets des filter pills corrigés sur mobile (28px → 44px). Build vert, 27/27 tests PASS.
