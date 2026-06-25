---
name: Obsidian Glass
colors:
  surface: '#121414'
  surface-dim: '#121414'
  surface-bright: '#37393a'
  surface-container-lowest: '#0c0f0f'
  surface-container-low: '#1a1c1c'
  surface-container: '#1e2020'
  surface-container-high: '#282a2b'
  surface-container-highest: '#333535'
  on-surface: '#e2e2e2'
  on-surface-variant: '#c4c5d5'
  inverse-surface: '#e2e2e2'
  inverse-on-surface: '#2f3131'
  outline: '#8e909f'
  outline-variant: '#444653'
  surface-tint: '#b8c4ff'
  primary: '#b8c4ff'
  on-primary: '#002584'
  primary-container: '#1e40af'
  on-primary-container: '#a8b8ff'
  inverse-primary: '#3755c3'
  secondary: '#ddb7ff'
  on-secondary: '#490080'
  secondary-container: '#6f00be'
  on-secondary-container: '#d6a9ff'
  tertiary: '#ffb59a'
  on-tertiary: '#5a1b00'
  tertiary-container: '#872d00'
  on-tertiary-container: '#ffa583'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c4ff'
  on-primary-fixed: '#001453'
  on-primary-fixed-variant: '#173bab'
  secondary-fixed: '#f0dbff'
  secondary-fixed-dim: '#ddb7ff'
  on-secondary-fixed: '#2c0051'
  on-secondary-fixed-variant: '#6900b3'
  tertiary-fixed: '#ffdbce'
  tertiary-fixed-dim: '#ffb59a'
  on-tertiary-fixed: '#380d00'
  on-tertiary-fixed-variant: '#802a00'
  background: '#121414'
  on-background: '#e2e2e2'
  surface-variant: '#333535'
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '200'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '300'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '300'
    lineHeight: 36px
  title-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-padding: 24px
  gutter: 16px
  card-gap: 20px
  safe-area-bottom: 32px
---

## Brand & Style

The brand personality is high-end, mysterious, and intellectually stimulating. It targets a sophisticated audience that appreciates the intersection of classic social gaming and cutting-edge digital aesthetics. The UI must evoke a sense of focused immersion, using the deep black background to make game elements appear as if they are floating in a void.

The design style is a hybrid of **Liquid Glassmorphism** and **Neomorphism 2.0**. It leverages the pure black backdrop (#000000) to create "infinite depth." Elements are not just flat layers; they are translucent glass slabs with subtle internal glows, refractive borders, and soft, diffused shadows that suggest physical presence without heavy traditional skeuomorphism. The emotional response is one of premium quality—slick, responsive, and visually quiet.

## Colors

The palette is anchored by a **Pure Black (#000000)** foundation to achieve maximum contrast and battery efficiency on OLED displays. 

- **Midnight Blue (#1E40AF):** Used for primary actions and steady-state interactive elements. It should feel like a deep, liquid pool.
- **Neon Purple (#A855F7):** Reserved for "Magic Moments," high scores, and active player indicators.
- **Soft Emerald (#10B981):** A gentle, glowing green used exclusively for correct guesses.
- **Coral Red (#F87171):** A vibrant, high-visibility red used for "Tabu" or forbidden words and timer expiration.

All accent colors should be implemented with a "glow" property—using high-saturation values with low-opacity outer blurs to simulate light emitting from within the glass elements.

## Typography

This design system utilizes **Inter** to achieve a modern, technical, yet highly legible feel. The typographic hierarchy leans heavily into thin weights (`200` and `300`) for large display text to maintain an "Apple-like" elegance. 

Contrast is created through weight distribution: use very thin weights for headlines to feel premium, and medium weights (`500`) for interactive labels to ensure clarity. Tracking (letter spacing) should be slightly tightened on large headings and opened up on small uppercase labels to maximize legibility against the dark background.

## Layout & Spacing

The layout philosophy follows a **Fluid Grid** with generous safe margins. Given the mobile-first nature of a word-guessing game, the layout prioritizes the "Thumb Zone"—placing primary interaction points in the lower two-thirds of the screen.

- **Desktop/Tablet:** Content is centered in a 600px wide "Glass Column" to maintain focus.
- **Mobile:** Elements span the full width minus the 24px container padding.
- **Vertical Rhythm:** A strict 8px base unit is used. Spacing between "Tabu" words in a list should be tighter (12px) to group them visually as a single "Forbidden Set," while the gap between the main word and the forbidden list should be larger (32px).

## Elevation & Depth

Depth is the core differentiator of this design system. It is achieved through three specific techniques:

1.  **Backdrop Blurs:** Every card uses a `saturate(180%) blur(20px)` filter. This creates the "liquid" feel as the background glow effects move behind the panels.
2.  **Inner Glow (Neomorphism 2.0):** Instead of heavy external shadows, use a 1px inner border with a linear gradient (Top-Left: white at 10% opacity, Bottom-Right: white at 2% opacity). This simulates the edge of a glass pane catching light.
3.  **Shadow Character:** For floating elements, use a "Double Shadow": 
    - Shadow 1: `0 4px 12px rgba(0,0,0,0.5)` (Tight)
    - Shadow 2: `0 20px 40px rgba(0,0,0,0.3)` (Diffused)

## Shapes

The shape language is sophisticated and smooth. 
- **Cards:** Use `rounded-lg` (1rem / 16px) for the main word cards to feel substantial.
- **Interactive Buttons:** Use **Pill-shaped** (full radius) for "Start Game," "Correct," and "Tabu" buttons. The organic, oval nature of these buttons contrasts with the structured cards.
- **Input Fields:** Use `rounded-lg` to match the card containers.
- **Icons:** Use thin (1px or 1.5px) stroke weights with slightly rounded terminals to match the typography.

## Components

### Buttons
- **Primary:** Oval/Pill-shaped. Background is a subtle vertical gradient of the accent color. Add a `1px` top-inner-highlight to suggest a glass surface.
- **Ghost/Outline:** Use a thin 1px border with the accent color and no fill. On hover/active, apply a soft outer glow in the accent color.

### Frosted Cards
The primary container for the "Word to Guess." 
- **Surface:** `rgba(255, 255, 255, 0.05)` fill with a heavy backdrop blur.
- **Border:** 1px solid `rgba(255, 255, 255, 0.1)`.
- **Active State:** When it's the player's turn, the card's border should pulse slowly with the Midnight Blue glow.

### Word Lists (Forbidden Words)
Listed beneath the main word. Each word should be separated by a thin, low-opacity divider. Use `label-caps` for the "TABU" header to create an authoritative, institutional feel.

### Timer / Progress Bar
A thin (4px) line at the very top of the screen. As time runs out, the color should transition from **Soft Emerald** to **Coral Red** using a CSS linear interpolation, accompanied by a soft glow that intensifies as the time reaches zero.

### Success/Failure Overlays
Full-screen glass blurs that momentarily tint the entire Pure Black background with a `rgba` version of Emerald (Success) or Coral (Tabu/Failure).