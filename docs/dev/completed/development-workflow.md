# Development Workflow & Best Practices

This guide covers development workflows, coding standards, and best practices for Cricket Manager development.

## Table of Contents

1. [Active Development Tracking](#active-development-tracking)
2. [Feature Development Workflow](#feature-development-workflow)
3. [Code Standards](#code-standards)
4. [Testing Strategy](#testing-strategy)
5. [Git Workflow](#git-workflow)
6. [Using Claude Code](#using-claude-code)

---

## Active Development Tracking

### ⚠️ Critical: The Anti-Amnesia System

**Problem**: Claude Code can lose context during long implementations, causing drift from the original plan.

**Solution**: Use the three-file tracking system in `active/` for ALL non-trivial features.

### The Three-File System

For every feature taking >30 minutes or involving multiple files:

```bash
mkdir docs/dev/active/[task-name]
```

Create three files:

1. **`plan.md`** - Approved implementation strategy (single source of truth)
2. **`context.md`** - Living context: files changed, decisions made, current state
3. **`tasks.md`** - Granular checklist with completion tracking

**See [active/README.md](active/README.md) for complete documentation and templates.**

### When to Update

- **`plan.md`**: Only when the plan fundamentally changes (rare)
- **`context.md`**: Continuously during implementation, especially before context runs low
- **`tasks.md`**: After completing tasks, when discovering new tasks

### Context Running Low Protocol

**When approaching >150k tokens**:

1. Update `context.md` with current state
2. Update `tasks.md` with remaining work
3. Document next 3 immediate steps clearly
4. Save all files before context compaction

This ensures seamless handoff to the next Claude session.

---

## Feature Development Workflow

### Step 1: Planning Phase

```bash
# 1. Create planning documents
mkdir docs/dev/active/[feature-name]
cd docs/dev/active/[feature-name]

# 2. Copy templates
cp ../active/_template_plan.md plan.md
cp ../active/_template_context.md context.md
cp ../active/_template_tasks.md tasks.md

# 3. Fill in plan.md
# - Feature objectives
# - Implementation approach
# - Architecture decisions
# - Success criteria
```

**Optional: Use plan-reviewer agent**
```
"Use the plan-reviewer agent to review this implementation plan for [feature]"
```

### Step 2: Implementation Phase

```markdown
## Implementation Loop

1. Pick next task from tasks.md
2. Implement the task
3. Test the implementation
4. Mark task complete in tasks.md
5. Document decisions in context.md
6. Commit working code
7. Repeat
```

**Key Principles:**
- Implement incrementally (small working steps)
- Test frequently (don't wait until the end)
- Document as you go (not at the end)
- Commit working states (before risky changes)

### Step 3: Review Phase

**Optional: Use code-architecture-reviewer agent**
```
"Use the code-architecture-reviewer agent to review the [feature] implementation"
```

**Self-review checklist:**
- [ ] All tasks in tasks.md completed
- [ ] Tests passing
- [ ] No hardcoded values (use config files)
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] Performance acceptable

### Step 4: Completion

```bash
# 1. Mark all tasks complete in tasks.md
# 2. Move to implementation-notes if needed
mv docs/dev/active/[feature-name] docs/dev/implementation-notes/

# 3. Update main documentation
# - Update CLAUDE.md "Current Development Status"
# - Update relevant docs in docs/
```

---

## Code Standards

### Configuration-First Approach

**ALL probabilities and game balance values MUST be in JSON config files.**

```javascript
// ❌ BAD: Hardcoded values
const wicketChance = 0.15;

// ✅ GOOD: Config-driven
import config from '../data/config/match-engine-config.json';
const wicketChance = config.wicketProbability;
```

**Config files location:** `src/data/config/*.json`

### File Organization

```
src/
├── core/                    # Core game systems
│   ├── match-engine/       # Ball-by-ball simulation
│   └── game/               # Game progression logic
├── stores/                 # Zustand state management
├── components/             # React UI components
│   ├── layout/             # Layout components
│   ├── match/              # Match-specific components
│   ├── team/               # Team management components
│   └── shared/             # Reusable components
├── data/                   # Static game data and configs
│   ├── config/             # JSON configuration files
│   └── players/            # Player database
└── utils/                  # Utility functions
```

### Naming Conventions

- **Components**: PascalCase - `PlayerCard.jsx`
- **Stores**: camelCase - `playerStore.js`
- **Utils**: camelCase - `formatDate.js`
- **Config files**: kebab-case - `match-engine-config.json`
- **Constants**: UPPER_SNAKE_CASE - `MAX_PLAYERS`

### JavaScript Standards

**Use JSDoc for type annotations:**

```javascript
/**
 * Calculate batting strike rate
 * @param {number} runs - Total runs scored
 * @param {number} balls - Total balls faced
 * @returns {number} Strike rate
 */
function calculateStrikeRate(runs, balls) {
  return balls > 0 ? (runs / balls) * 100 : 0;
}
```

**Destructure for clarity:**

```javascript
// ✅ GOOD
const { name, rating, role } = player;

// ❌ BAD
const name = player.name;
const rating = player.rating;
const role = player.role;
```

### React Component Standards

**Functional components with hooks:**

```jsx
import { useState, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';

/**
 * PlayerCard component displays player information
 * @param {Object} props
 * @param {Object} props.player - Player data
 * @param {Function} props.onSelect - Selection callback
 */
export default function PlayerCard({ player, onSelect }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="bg-cricket-green-800 rounded p-4"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h3 className="text-lg font-semibold">{player.name}</h3>
      {/* Component content */}
    </div>
  );
}
```

**Component patterns:**
- Extract complex logic to custom hooks
- Use React.memo for expensive renders
- Prefer composition over props drilling
- Keep components focused (single responsibility)

### Zustand Store Standards

```javascript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Player store manages player-related state
 */
export const usePlayerStore = create(
  persist(
    (set, get) => ({
      // State
      players: [],
      selectedPlayer: null,

      // Actions
      setPlayers: (players) => set({ players }),
      selectPlayer: (playerId) => set({ selectedPlayer: get().players.find(p => p.id === playerId) }),

      // Computed values
      getBattingPlayers: () => get().players.filter(p => p.role !== 'Bowler'),
    }),
    {
      name: 'player-storage',
      partialize: (state) => ({ players: state.players }),
    }
  )
);
```

### Tailwind CSS Standards

**Follow design system (see [design-system.md](../frontend/design-system.md))**

```jsx
// ✅ GOOD: Use design tokens
<div className="bg-cricket-green-800 text-trophy-gold-100 text-sm">

// ❌ BAD: Arbitrary values
<div className="bg-[#2D5F3F] text-[#D4AF37] text-[14px]">
```

**Responsive patterns:**
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

### Performance Standards

**Optimize calculations:**

```javascript
// ✅ GOOD: Algebraic calculation (fast)
const distance = Math.sqrt(dx * dx + dy * dy);

// ❌ BAD: Iterative simulation (slow)
while (time < maxTime) {
  position += velocity * deltaTime;
  time += deltaTime;
}
```

**Target: Match engine must simulate 50,000+ balls/second**

---

## Testing Strategy

### Test Files Location

```
src/test/
├── diagnosticBallTest.js      # Match engine outcome validation
├── detailedMatchTest.js        # Full match simulation
├── interactiveMatchTest.js     # Playable CLI match
├── demoInteractiveMatch.js     # Automated demo
├── leagueTest.js               # League simulation
└── demoAuction.js              # Auction simulation
```

### Running Tests

```bash
# Match engine diagnostics (outcome probabilities)
node src/test/diagnosticBallTest.js

# Full match simulation
node src/test/detailedMatchTest.js

# Interactive match (playable)
node src/test/interactiveMatchTest.js

# League simulation (5 matches)
node src/test/leagueTest.js

# Full season (90 matches + playoffs)
node src/test/leagueTest.js --full --playoffs --leaderboards

# Auction simulation
node src/test/demoAuction.js
```

### Test-Driven Tuning

When modifying match engine probabilities:

1. Update config file (e.g., `src/data/config/match-engine-config.json`)
2. Run diagnostics: `node src/test/diagnosticBallTest.js`
3. Review outcome distributions
4. Iterate until realistic

**Target distributions:**
- Dot balls: ~35-40%
- Singles: ~30-35%
- Boundaries: ~10-15%
- Wickets: ~3-5%

---

## Git Workflow

### Branch Strategy

```bash
# Main branch
main - Production-ready code

# Feature branches
git checkout -b feature/player-trading
git checkout -b fix/scorecard-display
git checkout -b refactor/match-engine
```

### Commit Message Format

```bash
# Format: type: description

# Types:
feat: Add player transfer system
fix: Fix scorecard not updating after wicket
refactor: Extract batting calculator to separate file
docs: Update match engine documentation
test: Add tests for fielding calculator
style: Format code with Prettier
chore: Update dependencies
```

### Commit Best Practices

- **Small, focused commits**: One logical change per commit
- **Working states**: Each commit should build successfully
- **Clear messages**: Explain WHY, not just WHAT
- **Test before commit**: Ensure tests pass

### Example Workflow

```bash
# 1. Create feature branch
git checkout -b feature/player-morale

# 2. Implement incrementally
git add src/core/player/MoraleCalculator.js
git commit -m "feat: Add morale calculation system"

git add src/stores/playerStore.js
git commit -m "feat: Integrate morale into player store"

git add src/components/team/PlayerCard.jsx
git commit -m "feat: Display morale in player card"

# 3. Test everything
npm run dev
# Manual testing...

# 4. Merge when complete
git checkout main
git merge feature/player-morale
```

---

## Using Claude Code

### Skills System

**Your project has custom skills that auto-activate:**

#### react-tailwind-zustand-guidelines

**Auto-activates when:**
- Editing `.jsx` files in `src/`
- Using keywords: "component", "UI", "modal", "styling", "state"
- Editing Zustand stores

**Provides guidance on:**
- React patterns
- Tailwind styling
- Zustand state management
- Performance optimization

**Manual invocation:**
```
"Use the react-tailwind-zustand-guidelines skill to help with [task]"
```

### Agents System

**Specialized agents for complex tasks:**

```bash
# Review code after implementation
"Use the code-architecture-reviewer agent to review [files/system]"

# Plan refactoring
"Use the refactor-planner agent to create a strategy for [refactoring goal]"

# Execute refactoring
"Use the code-refactor-master agent to implement the refactoring plan"

# Create documentation
"Use the documentation-god agent to document [system/feature]"

# Research solutions
"Use the web-research-specialist agent to research [technical problem]"
```

### Effective Prompting

**Be specific:**
```
❌ "Fix this component"
✅ "The PlayerCard component re-renders on every store update. Optimize with React.memo"
```

**Provide context:**
```
❌ "Create a modal"
✅ "Create a modal for player selection with multi-select, filtering by role, and Tailwind styling"
```

**Reference files:**
```
❌ "Update the store"
✅ "Update src/stores/gameStore.js to add a progressWeek action"
```

**See [claude-code-guide.md](claude-code-guide.md) for complete guide.**

---

## Quick Reference

### Starting a New Feature

```bash
# 1. Create active tracking
mkdir docs/dev/active/[feature-name]
# Create plan.md, context.md, tasks.md from templates

# 2. Create branch
git checkout -b feature/[feature-name]

# 3. Implement incrementally
# - Update tasks.md as you go
# - Document decisions in context.md
# - Commit working states

# 4. Test
npm run dev
node src/test/[relevant-test].js

# 5. Review
# - Use code-architecture-reviewer agent if needed
# - Self-review checklist

# 6. Complete
# - Update CLAUDE.md
# - Move tracking docs to implementation-notes/
# - Merge to main
```

### Common Commands

```bash
# Development
npm install              # Install dependencies
npm run dev              # Start dev server
npm run build            # Build for production
npm run lint             # Run ESLint

# Testing
node src/test/diagnosticBallTest.js      # Match engine diagnostics
node src/test/detailedMatchTest.js       # Full match
node src/test/interactiveMatchTest.js    # Playable match
node src/test/leagueTest.js --full       # Full season

# Git
git status                               # Check status
git add .                                # Stage changes
git commit -m "feat: description"       # Commit
git push origin feature/[name]          # Push branch
```

---

## Tips for Success

1. **Use active tracking religiously** - Prevents context drift
2. **Keep tasks granular** - 5-10 minute chunks
3. **Test incrementally** - Don't wait until the end
4. **Document WHY** - Future you needs context
5. **Commit working states** - Safety net for risky changes
6. **Follow config-first** - No hardcoded values
7. **Use skills/agents** - Leverage Claude Code infrastructure
8. **Review plan.md when stuck** - Ensure alignment

---

**Last Updated:** January 2025
**See Also:**
- [Claude Code Guide](claude-code-guide.md) - Complete Claude Code usage
- [Active Tracking System](active/README.md) - Anti-amnesia system
- [Setup Guide](setup-guide.md) - Installation and configuration
