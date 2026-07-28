# DESIGN_RULES — DuelIQ DA v3 (esport dur, anti-IA)
> Written 2026-07-28. Applicable à tout nouveau composant.

---

## INTERDICTIONS ABSOLUES

Ces éléments déclenchent immédiatement un "ça fait IA" :

| Interdit | Pourquoi |
|---|---|
| Dégradés décoratifs (`linear-gradient` sur fond, titre) | Signature IA/SaaS générique |
| Glassmorphism / `backdrop-filter: blur()` décoratif | Signature IA 2023-2025, trop doux |
| Orbes/blobs (`border-radius: 50%` + `filter: blur(80px)`) | Hero sections IA universelles |
| Glows colorés (`box-shadow` ou `drop-shadow` avec une couleur) | Soft, pas esport |
| Ombres colorées sur boutons (ex. `rgba(255,70,85,0.35)`) | Interdit — hover = décalage, pas glow |
| Glyphes décoratifs `◈ ◎ ★ ⬡` comme icônes | Aucune signification — remplacer par texte ou SVG géométrique |
| Emoji dans l'UI (`⚠ 🔥 ✓ ⎘`) | Infantilise l'interface |
| `border-radius > 6px` | Cards molles = SaaS, pas esport |
| Animations gratuites (bounce, float, pulse sur éléments statiques) | Distraction sans information |
| Gradient text (`-webkit-background-clip: text`) | Signature IA/Notion |
| Fond hero avec grid CSS décoratif | Pattern IA universel |

---

## SYSTÈME POSITIF

### Palette (4 couleurs max, tout à plat)

```
--navy:   #0F1923   — fond principal (Valorant exact)
--card:   #1C2127   — surface cards/sections
--off:    #ECE8E1   — texte primaire, off-white (Valorant exact)
--red:    #FF4655   — accent unique, sparingly
--muted:  #7B8FA1   — texte secondaire
--border: #2A3441   — bordures nettes
```

Règle : teal (#00D4AA) AUTORISÉ comme couleur sémantique (grade S / "Radiant") mais PAS comme accent principal. Rouge = seul accent UI.

### Typographie

```
--display: 'Anton', Impact, sans-serif   — UPPERCASE CONDENSED pour les titres display (H1, grade letters, scores gros)
--body:    'Inter', system-ui, sans-serif — corps, labels, tout le reste
```

Anton est une fonte OFL (SIL Open Font License), chargeable via Google Fonts. PAS de Space Grotesk comme display — trop générique.

**Type scale :**
```
Hero H1:        56px / font: Anton / uppercase / letter-spacing: 0.01em
Section H2:     22px / font: Anton / uppercase / letter-spacing: 0.04em
Card title:     14px / font: Inter 700 / uppercase / letter-spacing: 0.08em
Body:           14px / font: Inter 400 / normal
Label/badge:    11px / font: Inter 700 / uppercase / letter-spacing: 0.1em
Mono/score:     Inter 800 / tabular-nums
```

### Grille

- Unité de base : 4px
- Padding sections : 48px vertical, 20px horizontal (mobile) / 64px (desktop)
- Max-width conteneur : 760px (inchangé)
- Gap cards : 8px (pas 12px)

### Angles coupés (clip-path)

Utiliser sur : boutons CTA primaires, cards de la practice library (coin bas-droit), hero card du daily puzzle.

```css
/* CTA bouton : coin bas-droit coupé 8px */
clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%);

/* Card : coin haut-droit coupé 12px */
clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%);

/* Petit badge : coin droit coupé 4px */
clip-path: polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 0 100%);
```

### États hover

- Bouton primaire (rouge) : fond → `#ECE8E1`, texte → `#FF4655`, transition 0.1s
- Bouton secondaire : border-color → `#FF4655`, color → `#ECE8E1`
- Card library : `translateY(-2px)` + `border-color: #FF4655` (PAS de box-shadow coloré)
- Lien texte : underline offset 2px, pas de changement couleur

### Séparateurs de section

```css
border-top: 2px solid #FF4655;   /* section active/hero */
border-top: 1px solid #2A3441;   /* section neutre */
```

### Badges / Tags

Aplats opaques, clip-path coin coupé 4px, pas de `backdrop-filter` :
```css
background: #FF4655;
color: #0F1923;
padding: 2px 8px;
font: Inter 700 uppercase 11px;
letter-spacing: 0.1em;
clip-path: polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 0 100%);
```

### Boutons

```css
/* Primaire rouge */
.btn-primary {
  background: #FF4655;
  color: #ECE8E1;
  border: none;
  padding: 14px 24px;
  font: Inter 700 14px uppercase;
  letter-spacing: 0.08em;
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%);
  transition: background 0.1s, color 0.1s;
  cursor: pointer;
  min-height: 48px;
}
.btn-primary:hover {
  background: #ECE8E1;
  color: #FF4655;
}

/* Secondaire contour */
.btn-secondary {
  background: transparent;
  color: #7B8FA1;
  border: 1px solid #2A3441;
  padding: 12px 20px;
  font: Inter 600 13px;
  transition: border-color 0.1s, color 0.1s;
  cursor: pointer;
}
.btn-secondary:hover {
  border-color: #FF4655;
  color: #ECE8E1;
}
```

---

## COMPOSANTS CLÉ

### Theatre — overlays question/révélation
- Fond : `rgba(11,16,22,0.92)` — opaque à 92%, PAS de `backdrop-filter`
- Coins coupés sur le panel question
- Boutons choix : aplat `#1C2127`, border `#2A3441`, hover = border `#FF4655` + bg `#FF465514`
- Grade flash : lettre seule, Anton, sans drop-shadow coloré

### Cards Library
- `background: #1C2127` aplat
- `border: 1px solid #2A3441`
- Coin haut-droit coupé 10px
- Hover : `translateY(-2px)` + `border-color: #FF4655`
- Thumbnail blur : `filter: blur(12px)` sur l'img (pas `backdrop-filter`)

### Progress Panel
- Stat cards : `background: #1C2127`, `border: 1px solid #2A3441`, `border-radius: 0`
- Progress bar : `#FF4655` aplat (pas de gradient)
- Weakest theme banner : `border-left: 2px solid #FF4655` (accent gauche, pas de fond dégradé)

---

## HÉRITAGE AUTORISÉ

Ces éléments du code actuel sont CONSERVÉS tels quels :
- La palette de couleurs sémantiques des grades (S=vert/A=jaune/C=orange/X=rouge) — c'est de l'information, pas de la décoration
- Les keyframes `fade-in`, `slide-up`, `bar-fill` — utiles, sobres
- La structure SVG du timer circulaire — fonctionnelle
- Le vignette overlay sur la vidéo — nécessaire pour la lisibilité
- La logique responsive (portrait/landscape theatre)
