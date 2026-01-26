# Typography & Font System

This document outlines the typography system used in **Cricket Manager 25**. The project uses a set of carefully selected Google Fonts to convey a modern, sporty, and data-rich aesthetic.

## Font Families

The application uses three primary typefaces defined in `tailwind.config.js`:

### 1. Primary / Body Copy
*   **Font:** `Inter`
*   **Tailwind Class:** `font-primary` or `font-sans` (default)
*   **Usage:** Used for the majority of the UI text, body content, inputs, buttons, and general readability.
*   **Characteristics:** Clean, modern, highly legible at small sizes.

### 2. Display
*   **Font:** `Bebas Neue`
*   **Tailwind Class:** `font-display`
*   **Usage:** Used for high-impact headers, large numbers (e.g., scorecards, jersey numbers), and stylistic elements.
*   **Characteristics:** Condensed, uppercase-only, strong, "sporty" feel.

### 3. Headings & Data
*   **Font:** `Rajdhani`
*   **Tailwind Class:** `font-heading` or `font-data`
*   **Usage:** Used for section sub-headers, data tables, stats, and "tech" UI elements.
*   **Characteristics:** Squared, technical look that works well for cricket statistics and futuristic UI themes.

## Font Sizes

The font scale has been customized to fit a data-dense management interface, slightly smaller than the default Tailwind scale to fit more content.

| Token | Size | Size (px) | Typical Usage |
| :--- | :--- | :--- | :--- |
| `text-4xl` | `1.875rem` | 30px | Page Titles |
| `text-3xl` | `1.5rem` | 24px | Section Headers |
| `text-2xl` | `1.25rem` | 20px | Card Headers |
| `text-xl` | `1.125rem` | 18px | Sub-headers / Important Stats |
| `text-lg` | `1rem` | 16px | Large Body / Table Headers |
| `text-base` | `0.875rem` | 14px | Default Body Text |
| `text-sm` | `0.8125rem` | 13px | Small Text / Metadata |
| `text-xs` | `0.75rem` | 12px | Captions / Labels |
| `text-xxs` | `0.6875rem` | 11px | Micro text / Tiny indicators |

## Font Weights

| Token | Value |
| :--- | :--- |
| `font-light` | 300 |
| `font-regular` | 400 |
| `font-medium` | 500 |
| `font-semibold` | 600 |
| `font-bold` | 700 |
| `font-extrabold` | 800 |

## Usage Examples

```jsx
// Large Page Title (Bebas Neue)
<h1 className="font-display text-4xl text-cricket-accent">
  MATCH RESULT
</h1>

// Section Header (Rajdhani)
<h2 className="font-heading text-2xl font-semibold text-text-primary">
  Batting Scorecard
</h2>

// Data Table Cell (Rajdhani for numbers)
<td className="font-data text-right">
  {player.runs}
</td>

// Standard Text (Inter)
<p className="font-primary text-sm text-text-secondary">
  Match played at Eden Gardens
</p>
```
