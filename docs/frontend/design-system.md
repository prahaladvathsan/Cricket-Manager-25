# Cricket Manager Design System

## Overview

Cricket Manager follows a **Football Manager-inspired aesthetic** with **cricket broadcast-quality graphics**. The design is data-dense, professional, and optimized for displaying complex cricket statistics while maintaining visual clarity.

## Design Principles

1. **Data Density**: Maximize information display without overwhelming the user
2. **Professional Aesthetics**: Clean, business-like interface inspired by Football Manager
3. **Cricket-First**: Visual language inspired by cricket broadcasts and scorecards
4. **Tactical Clarity**: 2D pitch visualization with clear field positions
5. **Responsive Tables**: All data tables should be sortable, filterable, and readable
6. **Space Efficiency**: Compact, minimal spacing to maximize content visibility
7. **Visual Clarity**: Hidden scrollbars, center-aligned stats, no redundant headers

---

## Compact Design Philosophy (V2 - January 2025)

Cricket Manager has adopted a **space-efficient, compact design approach** to maximize content visibility and reduce visual clutter. This philosophy prioritizes information density while maintaining readability.

### Core Compact Design Rules

#### 1. **No Redundant Page Headers**
- **Remove page title bars** that duplicate navigation information
- Example: Don't show "Home" header on Home page - the sidebar already indicates location
- Exception: Keep headers that contain essential context or actions

```jsx
// ❌ Redundant header
<div>
  <h1 className="text-3xl">League</h1>
  {/* League content */}
</div>

// ✅ Compact approach - no header needed
<div>
  {/* League content directly */}
</div>
```

#### 2. **Minimal Spacing (Primary Rule)**
Use **compact spacing by default** across all components:

```css
/* Default spacing values */
space-y-2      /* Vertical stack spacing (8px) */
gap-2          /* Grid/flex gaps (8px) */
p-2            /* Card padding (8px) */
mb-2           /* Bottom margins (8px) */
pb-1 / pb-2    /* Bottom padding (4px / 8px) */
```

**Golden Rule**: Start with `space-y-2` and `gap-2`, only increase if absolutely necessary for readability.

```jsx
// ✅ Correct - Compact spacing
<div className="space-y-2">
  <div className="grid grid-cols-3 gap-2">
    <div className="card p-2">Content</div>
  </div>
</div>

// ❌ Wrong - Excessive spacing
<div className="space-y-6">
  <div className="grid grid-cols-3 gap-4">
    <div className="card p-6">Content</div>
  </div>
</div>
```

#### 3. **Hidden Scrollbars (Globally Applied)**
Scrollbars are **visually hidden** but remain **functionally present**.

```css
/* Applied globally to all elements */
* {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}
*::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}
```

**Why**: Cleaner visual appearance while maintaining full scroll functionality.

#### 4. **Center-Aligned Stat Boxes**
All statistical display boxes should use **center alignment** for visual balance.

```jsx
// ✅ Correct - Center-aligned stats
<div className="card p-2 text-center">
  <div className="text-2xl font-bold">24</div>
  <div className="text-text-secondary text-xs">Total Players</div>
</div>

// ❌ Wrong - Left-aligned stats (less balanced)
<div className="card p-2">
  <div className="text-2xl font-bold">24</div>
  <div className="text-text-secondary text-xs">Total Players</div>
</div>
```

#### 5. **Compact Buttons**
Reduce button sizes for space efficiency:

```jsx
// Standard compact button
<button className="btn-primary text-xs py-1 px-2">
  Action
</button>

// Secondary compact button
<button className="btn-secondary text-xs py-1 px-2">
  Action
</button>
```

**Original**: `text-sm py-2 px-4` (36px height)
**Compact**: `text-xs py-1 px-2` (24px height)

#### 6. **Integrate Actions into Navigation**
Move standalone action buttons into tab bars or navigation elements to save vertical space.

```jsx
// ✅ Correct - Actions in tab bar
<div className="border-b border-border-primary">
  <nav className="flex items-center justify-between">
    <div className="flex gap-2">
      {/* Tabs */}
    </div>
    <div className="flex gap-2">
      {/* Action buttons */}
    </div>
  </nav>
</div>

// ❌ Wrong - Separate header with buttons
<div className="flex justify-between mb-4">
  <h1>Page Title</h1>
  <div>{/* Buttons */}</div>
</div>
<div className="tabs">{/* Tabs */}</div>
```

#### 7. **Standard Tab Navigation Pattern**
All pages with multiple views should use the **consistent tab navigation pattern** for visual uniformity.

**✅ Standard Tab Pattern:**
```jsx
{/* Container with bottom border */}
<div className="border-b border-border-primary">
  <nav className="flex gap-2">
    {tabs.map(tab => {
      const Icon = tab.icon;
      return (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
            activeTab === tab.id
              ? 'border-cricket-accent text-cricket-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </div>
        </button>
      );
    })}
  </nav>
</div>
```

**Key properties:**
- **Container**: `border-b border-border-primary` (single bottom border)
- **Nav wrapper**: `flex gap-2` (horizontal flex with 8px gap)
- **Button**: `px-4 py-2 border-b-2` (padding + 2px bottom border indicator)
- **Active state**: `border-cricket-accent text-cricket-accent`
- **Inactive state**: `border-transparent text-text-secondary hover:text-text-primary`
- **Icon + Label**: Wrapped in `<div className="flex items-center gap-2">`
- **Text size**: `text-sm font-medium`

**With action buttons:**
```jsx
<div className="border-b border-border-primary">
  <nav className="flex items-center justify-between gap-2">
    <div className="flex gap-2">
      {/* Tabs */}
    </div>
    <div className="flex gap-2 pb-2">
      {/* Action buttons */}
    </div>
  </nav>
</div>
```

**Examples in codebase:**
- `src/components/layout/League.jsx` (lines 767-790)
- `src/components/team/Squad.jsx` (lines 704-737)
- `src/components/tactics/TacticsPage.jsx` (lines 163-189)
- `src/components/layout/Transfers.jsx` (auction tabs)

**❌ Wrong - Inconsistent patterns:**
```jsx
// Different spacing
<div className="flex gap-1 px-4 pt-3 border-b">

// Background color on container (creates visual weight)
<div className="bg-bg-secondary border-b">

// Inconsistent active state colors
className={activeTab === tab.id ? 'text-blue-500' : ''}
```

### Spacing Migration Guide

When updating existing components, follow these replacements:

| Old Value | New Value | Context |
|-----------|-----------|---------|
| `space-y-6` | `space-y-2` | Vertical stacks |
| `space-y-4` | `space-y-2` | Vertical stacks |
| `gap-4` | `gap-2` | Grid/flex gaps |
| `p-6` | `p-2` | Card padding |
| `p-4` | `p-2` | Card padding |
| `p-3` | `p-2` | Card padding |
| `mb-4` | `mb-2` | Bottom margins |
| `mb-3` | `mb-2` | Bottom margins |
| `pb-3` | `pb-2` or `pb-1` | Bottom padding |
| `text-3xl` (headers) | Remove or reduce | Page titles |
| `py-2 px-4` (buttons) | `py-1 px-2` | Button padding |

### When to Break Compact Rules

Use **larger spacing** only when:
1. **Readability suffers** - Text becomes cramped or hard to parse
2. **Visual hierarchy needed** - Important sections need clear separation
3. **Touch targets** - Interactive elements need adequate tap areas (mobile)
4. **Form inputs** - Input fields should remain comfortable to interact with

**Example - Keep larger spacing for forms**:
```jsx
// Forms maintain comfortable spacing
<div className="space-y-4">
  <input className="py-2 px-3" />
  <button className="py-2 px-4">Submit</button>
</div>
```

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

### Component-Specific Spacing (V2 - Compact)

**Note**: These values reflect the V2 compact design philosophy (January 2025).

```css
/* Layout */
--header-height: 64px;
--sidebar-width: 240px;
--sidebar-collapsed-width: 60px;

/* Cards and panels (COMPACT V2) */
--card-padding: 8px;           /* Default card padding (was 16px) */
--card-padding-lg: 12px;       /* Large card padding (was 24px) */
--card-padding-sm: 8px;        /* Small card padding (was 12px) */
--card-gap: 8px;               /* Gap between cards (was 16px) */
--card-border-radius: 8px;     /* Card corner radius */

/* Tables */
--table-row-height: 36px;      /* Standard row height */
--table-row-height-dense: 28px; /* Compact row height */
--table-padding-x: 12px;       /* Cell horizontal padding */
--table-padding-y: 8px;        /* Cell vertical padding */

/* Forms and inputs (Maintain comfortable sizing) */
--input-height: 40px;          /* Default input height */
--input-height-sm: 32px;       /* Small input height */
--input-padding-x: 12px;       /* Input horizontal padding */
--button-height: 40px;         /* Default button height (forms) */
--button-height-sm: 24px;      /* Compact button height (was 32px) */
--button-height-lg: 48px;      /* Large button height */
```

**Default Utility Classes (V2)**:
```css
/* Use these as defaults for most components */
.space-y-default { @apply space-y-2; }  /* 8px vertical spacing */
.gap-default { @apply gap-2; }          /* 8px grid/flex gaps */
.card-padding { @apply p-2; }           /* 8px card padding */
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

### Stats Display (V2 - Compact & Center-Aligned)
```jsx
// Stat card - MUST be center-aligned
<div className="card p-2 text-center">
  <div className="text-2xl font-bold text-text-primary font-mono">
    123.45
  </div>
  <div className="text-text-secondary text-xs">
    Label
  </div>
  <div className="text-text-positive text-xs">
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

// Stat grid (common pattern)
<div className="grid grid-cols-4 gap-2">
  <div className="card p-2 text-center">
    <div className="text-2xl font-bold">24</div>
    <div className="text-text-secondary text-xs">Players</div>
  </div>
  <div className="card p-2 text-center">
    <div className="text-2xl font-bold text-status-win">18</div>
    <div className="text-text-secondary text-xs">Wins</div>
  </div>
  {/* More stat boxes */}
</div>
```

### Clickable Entity Components

**Rule**: Always use `PlayerName` and `TeamName` components - never hardcode names.

```jsx
// ✅ Correct
<PlayerName playerId={player.id} />
<TeamName teamId={team.id} variant="short" />

// ❌ Wrong
<span>{player.name}</span>
<span>{team.name}</span>
```

Both components are clickable by default and open detail modals.

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

## Usage Examples (V2 - Compact)

### Dashboard Widget (Compact)
```jsx
<div className="card p-2 hover:border-border-accent transition-colors">
  <div className="flex items-center gap-2 mb-2 border-b border-border-primary pb-1">
    <Calendar className="w-4 h-4 text-cricket-accent" />
    <h3 className="text-lg font-semibold text-text-primary">
      Next Match
    </h3>
  </div>
  <div className="space-y-2">
    <div className="flex justify-between items-center text-sm">
      <span className="text-text-secondary">Opponent:</span>
      <TeamName teamId={opponentId} inline />
    </div>
    <div className="flex justify-between items-center text-sm">
      <span className="text-text-secondary">Venue:</span>
      <span className="text-text-primary">Wankhede Stadium</span>
    </div>
    <div className="flex justify-between items-center text-sm">
      <span className="text-text-secondary">Time:</span>
      <span className="text-text-primary font-mono">19:30 IST</span>
    </div>
  </div>
  <button className="w-full mt-2 btn-primary text-xs py-1">
    View Match
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

### Version 2.0 (January 2025) - Compact Design Update
- **Major redesign**: Adopted space-efficient, compact design philosophy
- **Global scrollbar hiding**: Visually hidden, functionally present
- **Removed redundant headers**: Page titles eliminated when redundant with navigation
- **Minimal spacing**: Default to `space-y-2`, `gap-2`, `p-2` (8px)
- **Center-aligned stats**: All stat boxes use `text-center`
- **Compact buttons**: Reduced to `text-xs py-1 px-2` (24px height)
- **Integrated navigation**: Action buttons moved into tab bars
- **Spacing migration guide**: Documented old → new value mappings
- **Updated component patterns**: All examples reflect compact approach

### Version 1.0 (January 2025)
- Initial design system creation
- Football Manager-inspired aesthetic
- Dark theme as default
- 2D pitch visualization guidelines
- Component pattern library

---

## Next Steps

1. ✅ Design system documented (V1)
2. ✅ Compact design philosophy implemented (V2)
3. **Extend Tailwind config** with design tokens
4. **Create screen layout specs** for each major view
5. **Build component library** using compact patterns
6. **Implement 2D pitch visualization**
7. **Create Claude Code skill** for design consistency
