# Claude Code Best Practices Guide

A comprehensive guide for using Claude Code effectively with Cricket-Manager-25.

---

## Table of Contents

1. [Overview](#overview)
2. [Skills System](#skills-system)
3. [Working with Agents](#working-with-agents)
4. [Effective Prompting](#effective-prompting)
5. [Project-Specific Tips](#project-specific-tips)
6. [Maintenance & Extension](#maintenance--extension)
7. [Common Workflows](#common-workflows)
8. [Troubleshooting](#troubleshooting)

---

## Overview

Your Cricket-Manager-25 project now has a complete Claude Code infrastructure:

- **2 Hooks**: Auto-activate skills and track file changes
- **2 Skills**: Meta-skill for skill development + custom React/Tailwind/Zustand guidelines
- **6 Agents**: Code review, refactoring, documentation, research

### What This Means

**Before:** You asked Claude to help with code, Claude responded with general advice.

**Now:** Claude automatically:
- ✅ Suggests best practices when you edit React components
- ✅ Recommends patterns specific to your tech stack
- ✅ Maintains context across file edits
- ✅ Follows Cricket-Manager-25 conventions

---

## Skills System

### How Skills Work

Skills are **automatic guidance systems** that activate based on:
1. **Keywords in your prompts** ("component", "modal", "styling")
2. **Files you're editing** (`.jsx` files in `src/`)
3. **Manual invocation** (when you explicitly ask)

### Your Available Skills

#### 1. **react-tailwind-zustand-guidelines**

**Purpose:** Frontend development best practices for Cricket-Manager-25

**Auto-activates when you:**
- Edit files: `src/**/*.jsx`, `src/stores/**/*.js`
- Use keywords: "component", "UI", "modal", "form", "styling", "state"
- Ask about: React patterns, Tailwind CSS, Zustand stores

**Contains guidance on:**
- React component structure
- Zustand state management patterns
- Tailwind CSS styling
- JavaScript/JSDoc type annotations
- Common UI patterns (modals, forms, tables)
- Performance optimization
- Routing patterns

**Example prompts that trigger:**
```
"Create a PlayerCard component"
"Add a modal for team selection"
"Style this button with Tailwind"
"Create a Zustand store for match state"
```

#### 2. **skill-developer**

**Purpose:** Learn how to create custom skills

**Auto-activates when you:**
- Use keywords: "skill system", "create skill", "skill triggers"
- Ask: "How do I create a new skill?"

**Use this when:**
- You want to create domain-specific skills (e.g., "cricket-game-logic")
- You need to customize trigger patterns
- You want to extend the skill system

---

## Working with Agents

Agents are **specialized assistants** that autonomously handle complex multi-step tasks.

### Available Agents

#### **code-architecture-reviewer**
Reviews code for architectural consistency and best practices.

**When to use:**
- After completing a significant feature
- Before merging large changes
- When refactoring complex systems

**Example:**
```
Use the code-architecture-reviewer agent to review my PlayerStore implementation
```

#### **plan-reviewer**
Reviews development plans before implementation.

**When to use:**
- Planning major features
- Before starting complex refactors
- When you want validation of your approach

**Example:**
```
I'm planning to add a transfer market system. Use the plan-reviewer agent to review this approach: [your plan]
```

#### **refactor-planner**
Creates comprehensive refactoring strategies.

**When to use:**
- Code has become messy or hard to maintain
- You want to improve structure without breaking things
- Planning technical debt cleanup

**Example:**
```
Use the refactor-planner agent to create a strategy for refactoring the match simulation system
```

#### **code-refactor-master**
Executes refactoring tasks systematically.

**When to use:**
- After creating a refactoring plan
- When you need careful, step-by-step refactoring

**Example:**
```
Use the code-refactor-master agent to refactor PlayerCard.jsx according to the plan we discussed
```

#### **documentation-architect**
Creates comprehensive documentation.

**When to use:**
- Documenting complex systems
- Creating user guides
- Writing API documentation

**Example:**
```
Use the documentation-architect agent to document the match engine system
```

#### **web-research-specialist**
Researches technical problems and solutions online.

**When to use:**
- Stuck on a technical problem
- Need latest best practices
- Want to explore new libraries/tools

**Example:**
```
Use the web-research-specialist agent to research best practices for optimizing React rendering performance
```

---

## Effective Prompting

### General Best Practices

#### ✅ DO: Be Specific

```
❌ "Fix this component"
✅ "The PlayerCard component re-renders too often. Use the react-tailwind-zustand-guidelines skill to help optimize it with useMemo"
```

#### ✅ DO: Provide Context

```
❌ "Create a modal"
✅ "Create a modal dialog for selecting players for the starting lineup. It should display player stats (name, rating, role) and allow multi-select. Use Tailwind for styling."
```

#### ✅ DO: Reference Files

```
❌ "Update the store"
✅ "Update src/stores/playerStore.js to add a new action for filtering players by role"
```

#### ✅ DO: Mention Tech Stack

When skills don't auto-activate, mention your stack:
```
"Create a form component using React, Tailwind, and Zustand for state"
```

### Skill-Specific Prompting

#### For React Components

```
✅ "Create a Scorecard component that displays match score, overs, and run rate. Include loading states and use Tailwind for styling."

✅ "Help me refactor this component to follow React best practices. Use the react-tailwind-zustand-guidelines skill."
```

#### For Zustand Stores

```
✅ "Create a Zustand store for managing auction state with actions for bidding, player selection, and budget tracking."

✅ "Show me how to add persistence to my teamStore using Zustand middleware."
```

#### For Styling

```
✅ "Style this button component with Tailwind to have primary/secondary/danger variants and sm/md/lg sizes."

✅ "Create a responsive grid layout for player cards that shows 1 column on mobile, 2 on tablet, 3 on desktop."
```

### Agent-Specific Prompting

#### Pattern: Define Task Scope

```
✅ "Use the [agent-name] agent to [specific task] in [specific files/area]"

Examples:
- "Use the code-architecture-reviewer agent to review the entire src/stores/ directory"
- "Use the refactor-planner agent to create a plan for extracting match logic from MatchPage.jsx into custom hooks"
```

#### Pattern: Include Success Criteria

```
✅ "Use the [agent] to [task], ensuring [criteria]"

Example:
- "Use the code-refactor-master agent to refactor PlayerList.jsx, ensuring no functionality changes and performance improves"
```

---

## Project-Specific Tips

### Cricket-Manager-25 Conventions

#### File Organization

Your project uses feature-based organization:
```
src/
├── components/       # Shared UI components
├── stores/          # Zustand stores
├── pages/           # Page components
├── core/            # Game logic
├── data/            # Static data
└── utils/           # Helper functions
```

**When asking for new features:**
```
✅ "Create a PlayerSelectionModal component in src/components/"
✅ "Add a new action to src/stores/gameStore.js"
```

#### Naming Conventions

- **Components:** PascalCase - `PlayerCard.jsx`
- **Stores:** camelCase - `playerStore.js`
- **Utils:** camelCase - `formatDate.js`

**Mention these in prompts:**
```
✅ "Create a TeamStatsCard component following our PascalCase naming"
```

#### State Management

You use Zustand, not Redux or Context:
```
✅ "Add this to the Zustand store"
❌ "Add this to Redux"
```

#### Styling

You use Tailwind, not CSS modules or styled-components:
```
✅ "Style with Tailwind utility classes"
❌ "Use styled-components"
```

### Common Cricket-Manager Tasks

#### Creating a New Game Feature

```
"I want to add a player fitness tracking system. Use the plan-reviewer agent to review this approach:
1. Add fitness attribute to player data
2. Create usePlayerFitness hook
3. Add fitness display to PlayerCard
4. Create FitnessManager component for bulk updates

Tech stack: React, Zustand, Tailwind"
```

#### Adding a New UI Component

```
"Create a MatchSummaryCard component that displays:
- Team names and scores
- Match result
- Player of the match
- Date played

Use the react-tailwind-zustand-guidelines skill and follow our existing component patterns in src/components/"
```

#### Refactoring Game Logic

```
"The match simulation code in src/core/match-engine/ has become complex. Use the refactor-planner agent to create a strategy for:
1. Extracting ball-by-ball logic into separate modules
2. Improving testability
3. Adding better error handling"
```

---

## Maintenance & Extension

### Creating New Skills

As your project grows, you might want domain-specific skills:

**Example: Cricket Game Logic Skill**

```
"Use the skill-developer skill to help me create a new skill called 'cricket-game-logic' that activates when:
- Editing files in src/core/match-engine/
- Using keywords: 'wicket', 'over', 'innings', 'simulation'
- The skill should enforce cricket rules and match engine patterns"
```

### Updating Existing Skills

Skills can be updated by editing files in `.claude/skills/`:

**To add new patterns:**
1. Edit `.claude/skills/skill-rules.json` - Add new keywords
2. Edit skill resource files - Add new examples
3. Test by triggering the skill

**Example:**
```
"Add 'player progression' and 'attribute growth' keywords to the react-tailwind-zustand-guidelines skill triggers"
```

### Managing Agents

Agents don't require configuration - just copy new ones to `.claude/agents/`

**To create custom agents:**
```
"Help me create a custom agent for testing match simulations that:
1. Runs multiple matches with different configurations
2. Analyzes statistical outcomes
3. Reports anomalies"
```

---

## Common Workflows

### Workflow 1: Building a New Feature

```
Step 1: Planning
"I want to add a player transfer system. Use the plan-reviewer agent to review this approach: [describe system]"

Step 2: Create Components
"Create a TransferMarketPage component with player listings and bid functionality. Use react-tailwind-zustand-guidelines."

Step 3: Add State Management
"Create a Zustand store for transfer market state with actions for bidding and player acquisition."

Step 4: Review
"Use the code-architecture-reviewer agent to review the transfer system implementation."
```

### Workflow 2: Refactoring Complex Code

```
Step 1: Identify Problem
"The MatchSimulator class in src/core/match-engine/ is 800 lines and hard to test."

Step 2: Create Plan
"Use the refactor-planner agent to create a strategy for breaking this into smaller, testable modules."

Step 3: Execute Refactoring
"Use the code-refactor-master agent to implement the refactoring plan, starting with extracting ball calculation logic."

Step 4: Verify
"Run the match tests and use code-architecture-reviewer to verify the new structure."
```

### Workflow 3: Learning New Patterns

```
Step 1: Ask for Examples
"Show me examples of React.memo optimization from the performance.md resource in react-tailwind-zustand-guidelines."

Step 2: Apply to Project
"Help me apply React.memo to the PlayerList component which renders 100+ players."

Step 3: Measure
"How can I verify the performance improvement?"
```

### Workflow 4: Documentation Sprint

```
Step 1: Architecture Docs
"Use the documentation-architect agent to document the match engine architecture in src/core/match-engine/."

Step 2: Component Docs
"Document all components in src/components/ with JSDoc annotations and usage examples."

Step 3: User Guide
"Create a PLAYING_GUIDE.md that explains how to play Cricket Manager."
```

---

## Troubleshooting

### Skill Not Activating

**Problem:** Skill doesn't suggest when you expect it to

**Solutions:**
1. **Manually invoke:** "Use the react-tailwind-zustand-guidelines skill to..."
2. **Use explicit keywords:** Include trigger words in your prompt
3. **Check file patterns:** Ensure you're editing files that match triggers
4. **Verify skill-rules.json:** Check `.claude/skills/skill-rules.json` for triggers

### Agent Not Working

**Problem:** Agent doesn't seem to be helping

**Solutions:**
1. **Check agent name:** Use exact name from `.claude/agents/`
2. **Be specific:** Provide clear task description
3. **Check file existence:** Ensure agent .md file is in `.claude/agents/`

### Hooks Not Running

**Problem:** Auto-activation seems broken

**Solutions:**
1. **Check settings.json:** Verify `.claude/settings.json` has hook configs
2. **Verify permissions:** Run `chmod +x .claude/hooks/*.sh`
3. **Check dependencies:** Run `cd .claude/hooks && npm install`
4. **View hook output:** Check console for hook errors

### Getting Different Advice Than Expected

**Problem:** Claude suggests patterns that don't match your project

**Solutions:**
1. **Mention your stack explicitly:** "Using React, Tailwind, and Zustand"
2. **Reference existing patterns:** "Following the pattern in PlayerCard.jsx"
3. **Use skills:** "Use react-tailwind-zustand-guidelines skill"
4. **Provide context:** Share your CLAUDE.md file context

---

## Quick Reference

### Skill Invocation

```bash
# Auto-activates when editing .jsx files
# Manual invocation:
"Use the react-tailwind-zustand-guidelines skill to help with..."
```

### Agent Invocation

```bash
# Always manual:
"Use the [agent-name] agent to [task description]"
```

### Common Commands

```bash
# View skill resources
ls .claude/skills/react-tailwind-zustand-guidelines/resources/

# View agents
ls .claude/agents/

# Check hook dependencies
cd .claude/hooks && npm list

# Validate JSON configs
node -pe "JSON.parse(require('fs').readFileSync('.claude/settings.json')); 'valid'"
node -pe "JSON.parse(require('fs').readFileSync('.claude/skills/skill-rules.json')); 'valid'"
```

---

## Best Practices Summary

### ✅ Always Do

- **Be specific** about what you want
- **Reference files** by exact path
- **Mention tech stack** when needed
- **Use skills** for domain expertise
- **Use agents** for complex multi-step tasks
- **Provide context** about your project
- **Test changes** before committing
- **Review agent output** - they're assistants, not replacements

### ❌ Never Do

- **Assume Claude knows** your exact setup
- **Use vague prompts** like "fix this"
- **Skip testing** after large changes
- **Ignore skill suggestions** without reason
- **Mix different patterns** (e.g., CSS modules + Tailwind)
- **Forget to commit** working code before refactoring

### 🎯 For Best Results

1. **Start broad, get specific**
   - "I want to add player trading" → Plan
   - "Create TransferMarket component" → Implement
   - "Use code-architecture-reviewer" → Verify

2. **Use progressive refinement**
   - Ask for outline first
   - Get feedback on approach
   - Implement incrementally
   - Review and improve

3. **Leverage your infrastructure**
   - Let skills guide patterns
   - Let agents handle complexity
   - Let hooks maintain context

---

## Resources

### Internal Documentation

- **Project Overview:** `CLAUDE.md`
- **Skill Documentation:** `.claude/skills/*/SKILL.md`
- **Agent Documentation:** `.claude/agents/*.md`
- **Skill Resources:** `.claude/skills/react-tailwind-zustand-guidelines/resources/`

### Key Skill Resources

- `component-patterns.md` - React component best practices
- `zustand-patterns.md` - State management
- `tailwind-styling-guide.md` - Styling patterns
- `javascript-jsdoc-standards.md` - Type annotations
- `common-patterns.md` - Modals, forms, tables
- `performance.md` - Optimization techniques
- `routing-patterns.md` - Navigation patterns
- `file-organization.md` - Project structure

### External Resources

- [Claude Code Docs](https://docs.claude.com/claude-code)
- [React Docs](https://react.dev)
- [Zustand Docs](https://zustand-demo.pmnd.rs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

---

## Getting Help

### From Claude Code

```
"How do I [task] using the [skill/agent]?"
"Show me an example from [resource file]"
"What's the best way to [task] in Cricket-Manager-25?"
```

### Debugging Skills/Agents

```
"Why isn't the react-tailwind-zustand-guidelines skill activating?"
"How do I check if my hooks are working?"
"List all available skills and their triggers"
```

### Project-Specific Questions

```
"What's the recommended pattern for [feature] in this project?"
"Show me existing examples of [pattern] in the codebase"
"Help me understand how [system] works in Cricket-Manager-25"
```

---

## Conclusion

You now have a powerful Claude Code infrastructure that will:
- ✅ Provide consistent guidance
- ✅ Maintain project conventions
- ✅ Accelerate development
- ✅ Improve code quality

**The more you use it, the more effective it becomes!**

Start with simple tasks, build confidence, then tackle complex features with agent support.

---

**Last Updated:** October 2025
**For:** Cricket-Manager-25 Project
