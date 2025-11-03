# Cricket Manager Design System

## Overview

Cricket Manager follows a **Football Manager-inspired aesthetic** with **cricket broadcast-quality graphics**. The design is data-dense, professional, and optimized for displaying complex cricket statistics while maintaining visual clarity.

## Design Principles

1. **Data Density**: Maximize information display without overwhelming the user
2. **Professional Aesthetics**: Clean, business-like interface inspired by Football Manager
3. **Cricket-First**: Visual language inspired by cricket broadcasts and scorecards
4. **Tactical Clarity**: 2D pitch visualization with clear field positions
5. **Responsive Tables**: All data tables should be sortable, filterable, and readable

---

## Color Palette

### Primary Colors
```css
/* Cricket Green - Main brand color */
--cricket-primary: #2D5F3F;        /* Deep cricket field green */
--cricket-primary-light: #3A7D52;  /* Lighter green for hover states */
--cricket-primary-dark: #1E4229;   /* Darker green for depth */

/* Accent - Gold/Amber for highlights */
--cricket-accent: #D4AF37;         /* Trophy gold */
--cricket-accent-light: #E6C963;   /* Light gold for borders */
--cricket-accent-dark: #B8941F;    /* Dark gold for emphasis */
```

### Neutral Colors (Dark Theme Base)
```css
/* Background hierarchy */
--bg-primary: #0F1419;     /* Main app background */
--bg-secondary: #1A1F26;   /* Card/panel background */
--bg-tertiary: #242B33;    /* Elevated elements */
--bg-hover: #2D3540;       /* Hover states */

/* Border colors */
--border-primary: #2D3540;   /* Default borders */
--border-secondary: #3D4550; /* Lighter borders */
--border-accent: #4D5560;    /* Highlighted borders */
```

### Text Colors
```css
/* Text hierarchy */
--text-primary: #E8EAED;     /* Primary text */
--text-secondary: #9AA0A6;   /* Secondary text */
--text-tertiary: #5F6368;    /* Tertiary/disabled text */
--text-inverse: #0F1419;     /* Text on light backgrounds */

/* Data-specific text */
--text-positive: #34A853;    /* Positive values (wins, gains) */
--text-negative: #EA4335;    /* Negative values (losses, declines) */
--text-neutral: #9AA0A6;     /* Neutral values */
--text-highlight: #D4AF37;   /* Highlighted data points */
```

### Status Colors
```css
/* Match/Game status */
--status-win: #34A853;         /* Win indicator */
--status-loss: #EA4335;        /* Loss indicator */
--status-tie: #FBBC04;         /* Tie/draw indicator */
--status-upcoming: #4285F4;    /* Upcoming match */
--status-live: #EA4335;        /* Live match (pulsing red) */

/* Player/Team status */
--status-excellent: #0F9D58;   /* Excellent form/rating */
--status-good: #34A853;        /* Good form/rating */
--status-average: #FBBC04;     /* Average form/rating */
--status-poor: #F4B400;        /* Poor form/rating */
--status-critical: #EA4335;    /* Critical/injury */
```

### Data Visualization Colors
```css
/* Chart colors (accessible, distinct) */
--chart-1: #4285F4;  /* Blue */
--chart-2: #34A853;  /* Green */
--chart-3: #FBBC04;  /* Yellow */
--chart-4: #EA4335;  /* Red */
--chart-5: #9334E6;  /* Purple */
--chart-6: #00ACC1;  /* Cyan */
--chart-7: #FF6D00;  /* Orange */
--chart-8: #E91E63;  /* Pink */

/* Heatmap gradient (cool to hot) */
--heat-cold: #4285F4;
--heat-cool: #34A853;
--heat-warm: #FBBC04;
--heat-hot: #EA4335;
```

---

## Typography

### Font Families
```css
/* Primary font - UI and headings */
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Monospace - Numbers and data tables */
--font-mono: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;

/* Serif - Commentary and narrative text */
--font-serif: 'Georgia', 'Times New Roman', serif;
```

### Type Scale
```css
/* Headings */
--text-4xl: 2.25rem;   /* 36px - Page titles */
--text-3xl: 1.875rem;  /* 30px - Section headers */
--text-2xl: 1.5rem;    /* 24px - Card headers */
--text-xl: 1.25rem;    /* 20px - Sub-headers */
--text-lg: 1.125rem;   /* 18px - Large body */

/* Body */
--text-base: 1rem;     /* 16px - Default body */
--text-sm: 0.875rem;   /* 14px - Small text */
--text-xs: 0.75rem;    /* 12px - Captions */
--text-xxs: 0.625rem;  /* 10px - Micro text */
```

### Font Weights
```css
--font-light: 300;
--font-regular: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
--font-extrabold: 800;
```

### Line Heights
```css
--leading-none: 1;
--leading-tight: 1.25;
--leading-snug: 1.375;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
--leading-loose: 2;
```

---

## Spacing System

### Base Unit: 4px

```css
/* Spacing scale (multiples of 4px) */
--space-0: 0;
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-5: 1.25rem;  /* 20px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-10: 2.5rem;  /* 40px */
--space-12: 3rem;    /* 48px */
--space-16: 4rem;    /* 64px */
--space-20: 5rem;    /* 80px */
```

### Component-Specific Spacing
```css
/* Layout */
--header-height: 64px;
--sidebar-width: 240px;
--sidebar-collapsed-width: 60px;

/* Cards and panels */
--card-padding: 16px;          /* Default card padding */
--card-padding-lg: 24px;       /* Large card padding */
--card-padding-sm: 12px;       /* Small card padding */
--card-gap: 16px;              /* Gap between cards */
--card-border-radius: 8px;     /* Card corner radius */

/* Tables */
--table-row-height: 36px;      /* Standard row height */
--table-row-height-dense: 28px; /* Compact row height */
--table-padding-x: 12px;       /* Cell horizontal padding */
--table-padding-y: 8px;        /* Cell vertical padding */

/* Forms and inputs */
--input-height: 40px;          /* Default input height */
--input-height-sm: 32px;       /* Small input height */
--input-padding-x: 12px;       /* Input horizontal padding */
--button-height: 40px;         /* Default button height */
--button-height-sm: 32px;      /* Small button height */
--button-height-lg: 48px;      /* Large button height */
```

---

## Component Patterns

### Cards
```jsx
// Standard card with shadow and border
<div className="
  bg-bg-secondary
  border border-border-primary
  rounded-lg
  p-card-padding
  shadow-md
  hover:border-border-accent
  transition-colors
">
  <h3 className="text-xl font-semibold text-text-primary mb-4">
    Card Title
  </h3>
  <div className="text-text-secondary">
    Card content
  </div>
</div>

// Elevated card for important content
<div className="
  bg-bg-tertiary
  border-2 border-cricket-accent
  rounded-lg
  p-card-padding-lg
  shadow-lg
">
  // Highlighted content
</div>
```

### Buttons
```jsx
// Primary action button
<button className="
  bg-cricket-primary
  hover:bg-cricket-primary-light
  text-white
  font-medium
  px-6 py-3
  rounded-md
  transition-colors
  disabled:opacity-50 disabled:cursor-not-allowed
">
  Primary Action
</button>

// Secondary button
<button className="
  bg-bg-tertiary
  hover:bg-bg-hover
  text-text-primary
  border border-border-primary
  font-medium
  px-6 py-3
  rounded-md
  transition-colors
">
  Secondary Action
</button>

// Danger button
<button className="
  bg-status-loss
  hover:bg-red-600
  text-white
  font-medium
  px-6 py-3
  rounded-md
  transition-colors
">
  Destructive Action
</button>
```

### Data Tables
```jsx
// Standard data table with hover states
<table className="w-full border-collapse">
  <thead>
    <tr className="border-b-2 border-border-primary">
      <th className="
        text-left
        text-text-secondary
        text-sm
        font-semibold
        uppercase
        tracking-wider
        px-table-padding-x
        py-table-padding-y
      ">
        Column Header
      </th>
    </tr>
  </thead>
  <tbody>
    <tr className="
      border-b border-border-primary
      hover:bg-bg-hover
      transition-colors
    ">
      <td className="
        px-table-padding-x
        py-table-padding-y
        text-text-primary
        font-mono  {/* For numeric data */}
      ">
        Data Cell
      </td>
    </tr>
  </tbody>
</table>

// Compact table for dense data
<table className="w-full text-sm">
  {/* Same structure with --table-row-height-dense */}
</table>
```

### Stats Display
```jsx
// Stat card
<div className="bg-bg-secondary rounded-lg p-4">
  <div className="text-text-secondary text-sm mb-1">
    Label
  </div>
  <div className="text-text-primary text-2xl font-bold font-mono">
    123.45
  </div>
  <div className="text-text-positive text-xs mt-1">
    +5.2% ↑
  </div>
</div>

// Inline stat
<span className="text-text-secondary">
  Runs:
  <span className="text-text-primary font-mono font-semibold ml-1">
    2,543
  </span>
</span>
```

### Form Indicator (W-L-W-L-W)
```jsx
// Recent form visualization
<div className="flex gap-1">
  <div className="w-6 h-6 rounded bg-status-win flex items-center justify-center text-white text-xs font-bold">
    W
  </div>
  <div className="w-6 h-6 rounded bg-status-loss flex items-center justify-center text-white text-xs font-bold">
    L
  </div>
  <div className="w-6 h-6 rounded bg-status-win flex items-center justify-center text-white text-xs font-bold">
    W
  </div>
  {/* etc */}
</div>
```

---

## Data Visualization Guidelines

### Tables
- **Always use monospace font** for numeric columns
- **Right-align numbers** for easy scanning
- **Left-align text** for readability
- **Zebra striping** optional, use hover states instead
- **Sortable columns** should have up/down arrow indicators
- **Highlight user's team** with subtle background color

### Charts and Graphs
- **Use consistent colors** from data viz palette
- **Include clear labels** and axis titles
- **Show data on hover** with tooltips
- **Responsive sizing** - adapt to container
- **Accessibility** - ensure color-blind friendly palettes

### Pitch Visualization (2D)
- **Green background** (#2D5F3F) for pitch
- **White boundary** rope circle
- **Fielders** as colored dots with team color
- **Ball trajectory** as red animated arc
- **Shot zones** as semi-transparent heat overlays
- **Labels on hover** for fielder names and positions

### Heatmaps
- **Cool-to-hot gradient** (blue → green → yellow → red)
- **Clear legend** with value ranges
- **Grid overlay** for cricket pitch zones
- **Interactive tooltips** showing exact values

---

## Layout Grid System

### Responsive Breakpoints
```css
--breakpoint-sm: 640px;   /* Small devices */
--breakpoint-md: 768px;   /* Tablets */
--breakpoint-lg: 1024px;  /* Laptops */
--breakpoint-xl: 1280px;  /* Desktops */
--breakpoint-2xl: 1536px; /* Large desktops */
```

### Grid Structure
```jsx
// Dashboard grid - 12 column system
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  {/* Cards span based on importance */}
  <div className="col-span-1 md:col-span-2">Large widget</div>
  <div className="col-span-1">Regular widget</div>
</div>

// Split view (match screen) - 60/40 split
<div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-full">
  <div className="lg:col-span-3">Left panel (pitch)</div>
  <div className="lg:col-span-2">Right panel (controls)</div>
</div>
```

### Max Width Constraints
```css
/* Content max-widths for readability */
--content-max-width-sm: 640px;
--content-max-width-md: 768px;
--content-max-width-lg: 1024px;
--content-max-width-xl: 1280px;
--content-max-width-full: 100%;
```

---

## Animation and Transitions

### Standard Transitions
```css
/* Hover states */
transition: all 0.2s ease-in-out;

/* Color changes */
transition: color 0.15s ease, background-color 0.15s ease;

/* Transform animations */
transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

### Specific Animations
```css
/* Live match indicator (pulsing red dot) */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.live-indicator {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Ball trajectory animation */
@keyframes ball-flight {
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(50%, -50%) scale(0.8); }
  100% { transform: translate(100%, 0) scale(1); }
}

/* Scorecard update flash */
@keyframes score-flash {
  0% { background-color: var(--cricket-accent); }
  100% { background-color: transparent; }
}
```

---

## Accessibility

### Color Contrast
- **Text on dark backgrounds**: Minimum 7:1 contrast ratio
- **Interactive elements**: Minimum 4.5:1 contrast ratio
- **Status colors**: Should be distinguishable without color alone

### Keyboard Navigation
- **All interactive elements** must be keyboard accessible
- **Focus indicators** should be clearly visible
- **Tab order** should follow logical reading order

### Screen Readers
- **Semantic HTML** for all components
- **ARIA labels** for icons and custom controls
- **Live regions** for dynamic match updates

---

## Dark Theme (Default)

Cricket Manager uses a **dark theme by default** for reduced eye strain during long management sessions.

### Light Theme (Optional Future Enhancement)
If light theme is added later:
- Invert background/text relationships
- Maintain sufficient contrast ratios
- Keep status colors consistent
- Adjust borders and shadows

---

## Usage Examples

### Dashboard Widget
```jsx
<div className="bg-bg-secondary border border-border-primary rounded-lg p-6 hover:border-border-accent transition-colors">
  <h3 className="text-xl font-semibold text-text-primary mb-4">
    Next Match
  </h3>
  <div className="space-y-3">
    <div className="flex justify-between items-center">
      <span className="text-text-secondary">Opponent:</span>
      <span className="text-text-primary font-semibold">London Lions</span>
    </div>
    <div className="flex justify-between items-center">
      <span className="text-text-secondary">Venue:</span>
      <span className="text-text-primary">Wankhede Stadium</span>
    </div>
    <div className="flex justify-between items-center">
      <span className="text-text-secondary">Time:</span>
      <span className="text-text-primary font-mono">19:30 IST</span>
    </div>
  </div>
  <button className="w-full mt-4 bg-cricket-primary hover:bg-cricket-primary-light text-white font-medium py-2 rounded-md transition-colors">
    View Match Details
  </button>
</div>
```

### League Table Row
```jsx
<tr className="border-b border-border-primary hover:bg-bg-hover transition-colors">
  <td className="px-3 py-2 text-text-primary font-mono text-center">1</td>
  <td className="px-3 py-2 text-text-primary font-semibold">Mumbai Thunders</td>
  <td className="px-3 py-2 text-text-primary font-mono text-center">9</td>
  <td className="px-3 py-2 text-text-primary font-mono text-center">7</td>
  <td className="px-3 py-2 text-text-primary font-mono text-center">2</td>
  <td className="px-3 py-2 text-text-primary font-mono text-center">14</td>
  <td className="px-3 py-2 text-text-positive font-mono text-center">+1.24</td>
</tr>
```

---

## Tools and Resources

### Design Tools
- **Figma**: For mockups and component design (optional)
- **Tailwind CSS**: Primary styling framework
- **Tailwind UI**: Reference for component patterns

### Color Tools
- **Contrast Checker**: https://webaim.org/resources/contrastchecker/
- **Color Palette Generator**: https://coolors.co/

### Typography Resources
- **Google Fonts**: https://fonts.google.com/
- **Type Scale Calculator**: https://type-scale.com/

---

## Changelog

### Version 1.0 (January 2025)
- Initial design system creation
- Football Manager-inspired aesthetic
- Dark theme as default
- 2D pitch visualization guidelines
- Component pattern library

---

## Next Steps

1. ✅ Design system documented
2. **Extend Tailwind config** with design tokens
3. **Create screen layout specs** for each major view
4. **Build component library** using these patterns
5. **Implement 2D pitch visualization**
6. **Create Claude Code skill** for design consistency
