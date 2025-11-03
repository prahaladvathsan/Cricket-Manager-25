# React + Tailwind + Zustand Development Guidelines

Comprehensive best practices for developing React applications using Tailwind CSS and Zustand state management with JavaScript/JSDoc.

---

## Skill Overview

This skill provides guidance on:
- **React Component Patterns** - Modern React patterns with hooks
- **Tailwind CSS** - Utility-first styling approach
- **Zustand State Management** - Simple, scalable state management
- **JavaScript/JSDoc** - Type safety without TypeScript compilation
- **Performance** - Optimization techniques
- **Common Patterns** - Forms, modals, tables, and more

---

## When to Use This Skill

**Automatically triggered when:**
- Creating or editing `.jsx` files
- Using keywords like "component", "UI", "page", "modal", "styling"
- Working on frontend features

**Manually invoke for:**
- Code reviews of React components
- Planning new frontend features
- Refactoring existing UI code
- Performance optimization

---

## Quick Reference

### Component Structure

```jsx
import { useState, useEffect } from 'react';
import { useGameStore } from '~/stores/gameStore';

/**
 * Player card component
 * @param {Object} props
 * @param {Object} props.player - Player data
 * @param {() => void} [props.onSelect] - Optional selection handler
 * @returns {JSX.Element}
 */
export const PlayerCard = ({ player, onSelect }) => {
    // 1. State and store selectors
    const [expanded, setExpanded] = useState(false);
    const selectedPlayers = useGameStore((state) => state.selectedPlayers);

    // 2. Derived state
    const isSelected = selectedPlayers.includes(player.id);

    // 3. Event handlers
    const handleClick = () => {
        setExpanded(!expanded);
    };

    // 4. Effects
    useEffect(() => {
        // Side effects here
    }, [player.id]);

    // 5. Render
    return (
        <div
            onClick={handleClick}
            className={`
                p-4 rounded-lg border transition-colors cursor-pointer
                ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
            `}
        >
            <h3 className="text-lg font-semibold">{player.name}</h3>
            <p className="text-gray-600">Rating: {player.rating}</p>

            {expanded && (
                <div className="mt-4 pt-4 border-t">
                    {/* Expanded content */}
                </div>
            )}
        </div>
    );
};
```

### Zustand Store Pattern

```jsx
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useGameStore = create(
    persist(
        (set, get) => ({
            // State
            currentSeason: 1,
            selectedPlayers: [],

            // Actions
            setSeason: (season) => set({ currentSeason: season }),

            togglePlayerSelection: (playerId) => {
                set((state) => ({
                    selectedPlayers: state.selectedPlayers.includes(playerId)
                        ? state.selectedPlayers.filter(id => id !== playerId)
                        : [...state.selectedPlayers, playerId],
                }));
            },

            // Computed
            getSelectedCount: () => get().selectedPlayers.length,
        }),
        {
            name: 'game-storage',
        }
    )
);
```

### Tailwind Styling

```jsx
// Component with variants
export const Button = ({ children, variant = 'primary', size = 'md', ...props }) => {
    const variants = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
        danger: 'bg-red-600 text-white hover:bg-red-700',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
    };

    return (
        <button
            className={`
                rounded font-medium transition-colors focus:outline-none focus:ring-2
                ${variants[variant]}
                ${sizes[size]}
            `}
            {...props}
        >
            {children}
        </button>
    );
};
```

---

## Core Principles

### 1. Component Organization

**File Structure:**
```
src/
├── components/          # Shared components
│   ├── Button.jsx
│   ├── Card.jsx
│   └── Modal.jsx
├── pages/              # Page components
│   ├── HomePage.jsx
│   └── DashboardPage.jsx
├── stores/             # Zustand stores
│   ├── gameStore.js
│   └── playerStore.js
└── utils/              # Helper functions
```

**Component Naming:**
- PascalCase for components: `PlayerCard.jsx`
- camelCase for utilities: `formatDate.js`
- Descriptive names: `PlayerSelectionModal` not `Modal2`

### 2. State Management Hierarchy

```
Local State (useState)
    ↓
Component Props
    ↓
Zustand Store (shared state)
    ↓
LocalStorage (persistence)
```

**When to use each:**
- `useState`: UI state (expanded, focused, etc.)
- Props: Parent-child communication
- Zustand: Shared application state
- LocalStorage: Data persistence

### 3. Performance First

```jsx
// ✅ CORRECT - Memoized selector
const playerName = usePlayerStore((state) =>
    state.players.find(p => p.id === id)?.name
);

// ❌ AVOID - Re-renders on ANY state change
const store = usePlayerStore();
const playerName = store.players.find(p => p.id === id)?.name;
```

---

## Resource Files

### Available Guides

1. **[component-patterns.md](resources/component-patterns.md)**
   - React.FC patterns
   - Hooks and composition
   - Lazy loading
   - Component communication

2. **[javascript-jsdoc-standards.md](resources/javascript-jsdoc-standards.md)**
   - JSDoc type annotations
   - Type definitions with @typedef
   - Null handling
   - Type guards

3. **[zustand-patterns.md](resources/zustand-patterns.md)**
   - Store organization
   - Async actions
   - Selectors and performance
   - Persistence

4. **[tailwind-styling-guide.md](resources/tailwind-styling-guide.md)**
   - Utility-first approach
   - Component variants
   - Responsive design
   - Dark mode

5. **[file-organization.md](resources/file-organization.md)**
   - Project structure
   - Feature-based organization
   - Import patterns

6. **[performance.md](resources/performance.md)**
   - useMemo and useCallback
   - React.memo
   - List optimization

7. **[routing-patterns.md](resources/routing-patterns.md)**
   - Route organization
   - Lazy loading routes
   - Protected routes

8. **[common-patterns.md](resources/common-patterns.md)**
   - Modals and dialogs
   - Forms with validation
   - Tables and pagination
   - Loading states
   - Toast notifications

---

## Common Tasks

### Creating a New Component

1. **Define the interface** with JSDoc
2. **Structure**: Hooks → Handlers → Render
3. **Use Tailwind** for styling
4. **Export** from index.js for clean imports

```jsx
/**
 * Match scorecard component
 * @param {Object} props
 * @param {Object} props.match - Match data
 * @returns {JSX.Element}
 */
export const Scorecard = ({ match }) => {
    // Implementation
};
```

### Creating a New Store

1. **Organize by feature**: One store per domain
2. **Include JSDoc types** for state and actions
3. **Add persistence** if needed
4. **Export custom selectors** for common patterns

See [zustand-patterns.md](resources/zustand-patterns.md#basic-store-pattern)

### Adding a New Page

1. **Create in pages/ directory**
2. **Use lazy loading** for route
3. **Add to routes configuration**
4. **Include Suspense boundary**

See [routing-patterns.md](resources/routing-patterns.md#lazy-loading-routes)

---

## Best Practices Checklist

### Before Creating a Component

- [ ] Is this truly reusable, or page-specific?
- [ ] What state does it need? (local vs store)
- [ ] What props will it accept?
- [ ] Does it need lazy loading?

### During Development

- [ ] JSDoc types on all props
- [ ] Memoized Zustand selectors
- [ ] Tailwind for all styling (no inline styles)
- [ ] Descriptive variable names
- [ ] Event handlers prefixed with `handle`
- [ ] Loading and error states handled

### Before Committing

- [ ] No console.logs
- [ ] No unused imports
- [ ] No magic numbers (use constants)
- [ ] Accessibility (focus states, ARIA labels)
- [ ] Responsive design tested

---

## Anti-Patterns to Avoid

### ❌ DON'T: Subscribe to Entire Store

```jsx
// ❌ WRONG
const store = useGameStore();  // Re-renders on ANY change

// ✅ CORRECT
const currentSeason = useGameStore((state) => state.currentSeason);
```

### ❌ DON'T: Mix Inline Styles with Tailwind

```jsx
// ❌ WRONG
<div className="p-4" style={{ color: 'red' }}>

// ✅ CORRECT
<div className="p-4 text-red-600">
```

### ❌ DON'T: Skip JSDoc on Exports

```jsx
// ❌ WRONG
export const MyComponent = ({ data }) => { ... }

// ✅ CORRECT
/**
 * Component description
 * @param {Object} props
 * @param {Array} props.data - Data array
 */
export const MyComponent = ({ data }) => { ... }
```

### ❌ DON'T: Create One-Off Components

```jsx
// ❌ WRONG - Too specific
export const BlueButtonWithIconOnLeft = () => { ... }

// ✅ CORRECT - Flexible with props
export const Button = ({ icon, iconPosition = 'left', variant = 'primary' }) => { ... }
```

---

## Progressive Disclosure

**This main file provides:**
- Overview and quick reference
- Core principles
- Common tasks
- Checklist

**Resource files provide:**
- Detailed patterns
- Complete examples
- Advanced techniques
- Edge cases

**Always start here**, then refer to specific resource files for detailed guidance.

---

## Getting Help

**For specific topics, see:**
- Components: [component-patterns.md](resources/component-patterns.md)
- Styling: [tailwind-styling-guide.md](resources/tailwind-styling-guide.md)
- State: [zustand-patterns.md](resources/zustand-patterns.md)
- Types: [javascript-jsdoc-standards.md](resources/javascript-jsdoc-standards.md)
- Performance: [performance.md](resources/performance.md)
- Patterns: [common-patterns.md](resources/common-patterns.md)

**For project-specific questions:**
- Check existing components in src/components
- Review similar patterns in the codebase
- Refer to your project's CLAUDE.md

---

## Summary

This skill ensures:
- ✅ Consistent React patterns
- ✅ Clean, maintainable code
- ✅ Performance optimization
- ✅ Type safety with JSDoc
- ✅ Scalable state management
- ✅ Professional UI with Tailwind

**Remember:** Follow the patterns, but adapt them to your specific needs. These are guidelines, not rigid rules.
