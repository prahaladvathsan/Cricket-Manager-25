# Cricket Manager UI Design System Skill

---
name: ui-design-system
description: Apply Cricket Manager's Football Manager-inspired design system when building or modifying UI components
trigger:
  keywords:
    - ui
    - design
    - component
    - frontend
    - layout
    - tailwind
    - styling
  patterns:
    - "create.*component"
    - "build.*ui"
    - "design.*screen"
    - "style.*page"
    - "add.*layout"
hooks:
  UserPromptSubmit:
    enforce: suggest
---

## Design System Overview

Cricket Manager uses a **Football Manager-inspired aesthetic** with **cricket broadcast-quality graphics**, featuring data-dense professional layouts optimized for complex cricket statistics.

### Key Principles
1. **Data Density**: Maximize information without overwhelming
2. **Professional Aesthetics**: Clean, business-like interface
3. **Cricket-First**: Visual language from cricket broadcasts
4. **Tactical Clarity**: 2D pitch visualization with clear positions
5. **Responsive Tables**: Sortable, filterable data displays

---

## Color Palette (Tailwind Classes)

### Primary Colors
```jsx
// Cricket Green - Main brand
bg-cricket-primary           // #2D5F3F
bg-cricket-primary-light     // #3A7D52
bg-cricket-primary-dark      // #1E4229

// Gold Accent
bg-cricket-accent            // #D4AF37
text-cricket-accent          // For highlights
border-cricket-accent        // For emphasis
```

### Background Hierarchy
```jsx
bg-bg-primary                // #0F1419 - Main app background
bg-bg-secondary              // #1A1F26 - Cards/panels
bg-bg-tertiary               // #242B33 - Elevated elements
bg-bg-hover                  // #2D3540 - Hover states
```

### Text Colors
```jsx
text-text-primary            // #E8EAED - Primary text
text-text-secondary          // #9AA0A6 - Secondary text
text-text-tertiary           // #5F6368 - Disabled text

// Data-specific
text-text-positive           // #34A853 - Wins, gains
text-text-negative           // #EA4335 - Losses, declines
text-text-highlight          // #D4AF37 - Important data
```

### Status Colors
```jsx
bg-status-win                // Green
bg-status-loss               // Red
bg-status-tie                // Yellow
text-status-excellent        // #0F9D58
text-status-good             // #34A853
text-status-poor             // #F4B400
```

---

## Typography

### Font Families
```jsx
font-primary                 // Inter (UI)
font-sans                    // Inter (general)
font-mono                    // For numbers/data
font-serif                   // For commentary
```

### Type Scale
```jsx
text-4xl                     // Page titles (36px)
text-3xl                     // Section headers (30px)
text-2xl                     // Card headers (24px)
text-xl                      // Sub-headers (20px)
text-base                    // Default body (16px)
text-sm                      // Small text (14px)
text-xs                      // Captions (12px)
```

### Font Weights
```jsx
font-light                   // 300
font-regular                 // 400
font-medium                  // 500
font-semibold                // 600
font-bold                    // 700
```

---

## Component Patterns

### Standard Card
```jsx
<div className="
  bg-bg-secondary
  border border-border-primary
  rounded-lg
  p-card-padding
  hover:border-border-accent
  transition-colors
">
  <h3 className="text-xl font-semibold text-text-primary mb-4">
    Card Title
  </h3>
  <div className="text-text-secondary">
    Content
  </div>
</div>
```

### Primary Button
```jsx
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
  Action
</button>
```

### Data Table
```jsx
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
        px-3 py-2
      ">
        Column
      </th>
    </tr>
  </thead>
  <tbody>
    <tr className="
      border-b border-border-primary
      hover:bg-bg-hover
      transition-colors
    ">
      <td className="px-3 py-2 text-text-primary font-mono">
        Data
      </td>
    </tr>
  </tbody>
</table>
```

### Form Indicator (W-L-W-L-W)
```jsx
<div className="flex gap-1">
  <div className="
    w-6 h-6 rounded
    bg-status-win
    flex items-center justify-center
    text-white text-xs font-bold
  ">
    W
  </div>
  <div className="
    w-6 h-6 rounded
    bg-status-loss
    flex items-center justify-center
    text-white text-xs font-bold
  ">
    L
  </div>
</div>
```

---

## Layout Guidelines

### Grid System
```jsx
// Dashboard grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Cards */}
</div>

// Match view split (60/40)
<div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
  <div className="lg:col-span-3">Left panel</div>
  <div className="lg:col-span-2">Right panel</div>
</div>
```

### Spacing
```jsx
// Component spacing
p-card-padding              // 16px padding
gap-4                       // 16px gap
space-y-4                   // 16px vertical spacing

// Layout spacing
w-sidebar                   // 240px sidebar width
h-header                    // 64px header height
```

---

## Screen-Specific Patterns

### Dashboard Widget
Use for overview cards on the dashboard:
```jsx
<div className="bg-bg-secondary border border-border-primary rounded-lg p-6">
  <h3 className="text-xl font-semibold text-text-primary mb-4">
    Widget Title
  </h3>
  {/* Widget content */}
</div>
```

### League Table Row
```jsx
<tr className="
  border-b border-border-primary
  hover:bg-bg-hover
  transition-colors
">
  <td className="px-3 py-2 text-text-primary font-mono text-center">
    {position}
  </td>
  <td className="px-3 py-2 text-text-primary font-semibold">
    {teamName}
  </td>
  <td className="px-3 py-2 text-text-primary font-mono text-center">
    {played}
  </td>
</tr>
```

### Match Header
```jsx
<header className="
  bg-bg-tertiary
  border-b-2 border-border-primary
  h-20
  flex items-center justify-between
  px-6
">
  <div className="flex items-center gap-4">
    <TeamBadge />
    <div>
      <div className="text-text-primary font-semibold text-xl">
        {teamName}
      </div>
      <div className="text-text-secondary text-sm">
        {venue}
      </div>
    </div>
  </div>
</header>
```

---

## Data Visualization

### Numbers
Always use monospace font for alignment:
```jsx
<span className="font-mono text-text-primary">
  123.45
</span>
```

### Positive/Negative Values
```jsx
<span className={runs > 0 ? 'text-text-positive' : 'text-text-negative'}>
  {runs > 0 ? '+' : ''}{runs}
</span>
```

### Progress Bars
```jsx
<div className="w-full bg-bg-tertiary rounded-full h-2">
  <div
    className="bg-cricket-primary h-2 rounded-full transition-all"
    style={{ width: `${percentage}%` }}
  />
</div>
```

---

## Responsive Breakpoints

```jsx
// Mobile first approach
<div className="
  grid
  grid-cols-1          /* Mobile: single column */
  md:grid-cols-2       /* Tablet: 2 columns */
  lg:grid-cols-3       /* Desktop: 3 columns */
  xl:grid-cols-4       /* Large: 4 columns */
  gap-6
">
```

---

## Accessibility

### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Use semantic HTML (`<button>`, `<a>`, etc.)
- Visible focus states: `focus:ring-2 focus:ring-cricket-accent`

### Screen Readers
```jsx
<button aria-label="Close dialog">
  <XIcon />
</button>

<div role="status" aria-live="polite">
  {statusMessage}
</div>
```

### Color Contrast
- Ensure 7:1 contrast for body text
- 4.5:1 for interactive elements
- Don't rely on color alone for meaning

---

## Animation

### Transitions
```jsx
transition-colors     // Color transitions
transition-all        // All properties
duration-200          // 200ms duration
```

### Specific Animations
```jsx
animate-pulse-slow    // Pulsing effect (live match)
animate-ball-flight   // Ball trajectory
animate-score-flash   // Score update flash
```

---

## When to Use This Skill

✅ **Use when**:
- Creating new React components
- Designing page layouts
- Styling UI elements
- Building data tables or cards
- Adding responsive breakpoints

❌ **Don't use when**:
- Working with core game logic (match engine, etc.)
- Modifying Zustand stores
- Writing tests
- Configuring build tools

---

## Quick Reference Links

- **Design System Docs**: `docs/frontend/design-system.md`
- **Match View Layout**: `docs/frontend/layouts/match-view-layout.md`
- **Dashboard Layout**: `docs/frontend/layouts/dashboard-layout.md`
- **League View Layout**: `docs/frontend/layouts/league-view-layout.md`
- **Tailwind Config**: `tailwind.config.js`

---

## Examples by Component Type

### Dashboard Card Component
```jsx
function DashboardCard({ title, children, action }) {
  return (
    <div className="
      bg-bg-secondary
      border border-border-primary
      rounded-lg
      p-6
      hover:border-border-accent
      transition-colors
    ">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-text-primary">
          {title}
        </h3>
        {action}
      </div>
      <div className="text-text-secondary">
        {children}
      </div>
    </div>
  );
}
```

### Stats Display Component
```jsx
function StatDisplay({ label, value, trend }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-text-secondary text-sm">
        {label}:
      </span>
      <div className="flex items-center gap-2">
        <span className="text-text-primary font-mono font-semibold">
          {value}
        </span>
        {trend && (
          <span className={
            trend > 0 ? 'text-text-positive' : 'text-text-negative'
          }>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  );
}
```

### Tab Navigation Component
```jsx
function TabNavigation({ tabs, activeTab, onTabChange }) {
  return (
    <div className="border-b border-border-primary">
      <nav className="flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              py-2 px-1
              border-b-2
              font-medium text-sm
              transition-colors
              ${activeTab === tab.id
                ? 'border-cricket-primary text-cricket-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
```

---

## Store Integration Pattern

When connecting components to Zustand stores:

```jsx
import useMatchStore from 'src/stores/matchStore';
import usePlayerStore from 'src/stores/playerStore';

function MatchComponent() {
  // Subscribe to specific slices
  const matchState = useMatchStore(state => ({
    teams: state.teams,
    currentBall: state.currentBall
  }));

  const updateTactics = useMatchStore(state => state.updateTacticsState);

  return (
    // Component JSX
  );
}
```

---

## Checklist for New Components

- [ ] Use design system colors (no hardcoded hex)
- [ ] Apply proper typography scale
- [ ] Include hover/focus states
- [ ] Add responsive breakpoints
- [ ] Use semantic HTML
- [ ] Add ARIA labels where needed
- [ ] Ensure keyboard navigation
- [ ] Test color contrast
- [ ] Use monospace for numbers
- [ ] Follow naming conventions
