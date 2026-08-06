---
inclusion: auto
---

# Publibor Design System

## Design philosophy
- Premium industrial, not startup trendy
- Editorial composition, not component assembly
- Fewer sections, each earning its place
- Typography and spacing carry the design — not icons, cards, or decorative elements

## Color tokens
```css
--gold: #f3c242;
--black: #000;
--near-black: #0c0c0c;
--white: #fff;
--off-white: #f6f5f3;
--gray-100: #edeceb;
--gray-200: #dddcda;
--gray-400: #a19d98;
--gray-600: #5c5854;
--gray-800: #2a2826;
```

## Typography
- Body: `system-ui, -apple-system, "Segoe UI", sans-serif`
- Brand wordmark: `"Chakra Petch"` (squared, industrial)
- Headings: 800 weight, tight letter-spacing (-0.02em to -0.03em)
- Body text: 0.82rem–1rem, line-height 1.5–1.7, gray-600 color
- Eyebrows: 0.68rem, 700 weight, 0.2em letter-spacing, uppercase, gold color

## Layout
- Max width: 1140px
- Container padding: 1.25rem mobile, 1.5rem desktop
- Section padding: `clamp(3.5rem, 10vw, 8rem)`

## Section rhythm
- Alternate dark/light backgrounds to create visual contrast
- Never stack 3+ dark sections in a row
- Current flow: dark hero → white → white (logos) → dark (mosaic) → white (trayectoria) → dark (contact) → dark (footer)

## Buttons
- Primary: gold background, black text, uppercase, 700 weight
- Secondary: transparent with border, uppercase
- WhatsApp: #25d366 green, white text, with WA icon
- All buttons: min-height 48px, full-width on mobile (<480px)
- Form inputs: 16px font-size (prevents iOS zoom), 48px min-height

## Cards and containers
- Border-radius: 12px mobile, 16px desktop
- Borders: 1px solid with very low opacity (rgba(0,0,0,0.06) on light, rgba(255,255,255,0.08) on dark)
- No excessive shadows — max `0 8px 24px rgba(0,0,0,0.06)` on hover

## What to avoid
- Generic icon-card grids
- SaaS/startup layout patterns
- Pill shapes, glassmorphism, gradient blobs
- Fake stats or trust badges
- Oversized testimonial blocks
- Decorative elements that add no commercial value
- More than 7 conversion cues on a single page

## Images
- Prefer real production photos over stock
- Use `loading="lazy"` and `decoding="async"` on all images below the fold
- Add `width` and `height` attributes to prevent layout shift
- Image placeholders use `data-image` attribute describing what photo should go there

## Motion
- Subtle only: hover lifts (translateY -3 to -4px), opacity transitions, scale on image hover (1.04–1.06)
- Hero video rotation via JS (sequential play, opacity crossfade)
- Logo marquee: CSS animation, 7s mobile / 30s desktop
- WhatsApp FAB: entry animation + pulse glow
- No parallax, no floating elements, no dramatic entrance animations
