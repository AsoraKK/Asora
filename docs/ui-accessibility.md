# Lythaus UI Accessibility Checks

Use this checklist to verify the Lythaus theme meets WCAG AA.

## Contrast pairs to verify
- onSurface text on surface, surfaceContainer, surfaceContainerHigh
- onPrimary text on primary (warm ivory)
- outline strokes against surface and surfaceContainer
- error text on surface and error containers
- icons on surface and surfaceContainer

## Minimum ratios
- Normal text: 4.5:1
- Large text (>= 18pt or 14pt bold): 3:1
- Non-text UI (icons, borders, focus indicators): 3:1

## How to verify
1. Use a contrast checker (WebAIM, Stark, or similar).
2. Sample the actual rendered colors from the UI (light + dark modes).
3. Check the pairs above and record any failures.
4. If a failure occurs, adjust the token in `lib/design_system/theme/lyth_color_schemes.dart`
   and re-check.

## Motion guidance
- Wordmark glow must pulse slowly (180-300s cycle, 6-10s duration).
- No rapid flashing or abrupt luminance changes.
- Respect reduced motion: animations disabled when the platform requests it.
