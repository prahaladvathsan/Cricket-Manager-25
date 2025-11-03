# Active Development Tracking System

## Purpose

This folder contains active development work organized by feature/task. This system prevents "context drift amnesia" during long implementations where Claude Code loses track of the original plan.

## The Three-File System

For **every feature implementation**, create a subfolder `[task-name]/` with three mandatory files:

### 1. `plan.md` - Implementation Strategy
The **accepted** implementation plan that was approved before coding began.

**Purpose**: Single source of truth for what was agreed upon
**When to update**: Only when the plan fundamentally changes (rare)
**Contents**:
- Feature overview and objectives
- Approved implementation approach
- Architecture decisions
- Key technical decisions
- Success criteria

### 2. `context.md` - Living Implementation Context
Tracks key files, decisions, and current state during implementation.

**Purpose**: Quick context restoration for Claude sessions
**When to update**: Continuously during implementation, especially before context compaction
**Contents**:
- Key files modified (with paths)
- Important decisions made during implementation
- Deviations from original plan (with rationale)
- Current implementation state
- Known issues or blockers
- Dependencies discovered

### 3. `tasks.md` - Living Checklist
Granular task breakdown with completion tracking.

**Purpose**: Ensure no steps are forgotten
**When to update**: Continuously - mark completed, add new tasks discovered
**Contents**:
- [ ] Task checklist with completion status
- Sub-tasks discovered during implementation
- Testing tasks
- Documentation tasks
- Next immediate steps

## Usage Workflow

### Starting a New Feature
```bash
# 1. Create feature folder
mkdir docs/dev/active/[task-name]

# 2. Create three files from templates below
cp docs/dev/active/_template_plan.md docs/dev/active/[task-name]/plan.md
cp docs/dev/active/_template_context.md docs/dev/active/[task-name]/context.md
cp docs/dev/active/_template_tasks.md docs/dev/active/[task-name]/tasks.md

# 3. Fill in plan.md with approved strategy
# 4. Update tasks.md with initial task breakdown
# 5. Start implementation
```

### During Implementation
1. **After completing tasks**: Update `tasks.md` with checkmarks
2. **After making decisions**: Document in `context.md`
3. **Before context runs low**: Explicitly update `context.md` with next steps
4. **When stuck**: Review `plan.md` to ensure alignment

### Completing a Feature
1. Mark all tasks complete in `tasks.md`
2. Move folder to `docs/dev/implementation-notes/[task-name]/` (archive)
3. Create summary in `docs/dev/implementation-notes/[task-name].md` if needed

## Anti-Amnesia Protocol

**CRITICAL**: When Claude Code context is running low (>150k tokens), explicitly:
1. Update `context.md` with current state
2. Update `tasks.md` with remaining work
3. Document next immediate steps clearly
4. Save all files before context compaction

This ensures the next Claude session can pick up seamlessly.

---

## File Templates

### Template: `plan.md`

```markdown
# [Feature Name] - Implementation Plan

**Status**: [Planning | In Progress | Completed]
**Start Date**: YYYY-MM-DD
**Target Completion**: YYYY-MM-DD

## Objectives
- Primary goal of this feature
- Success criteria

## Implementation Approach

### Architecture
- How this fits into existing system
- New components/files needed
- Integration points

### Key Technical Decisions
- Decision 1: [Rationale]
- Decision 2: [Rationale]

### Data Structures
- New data models
- State management approach

### Algorithm/Logic
- Core algorithm description
- Edge cases to handle

## Testing Strategy
- Unit tests needed
- Integration tests
- Manual testing steps

## Risks & Mitigations
- Potential issues
- How to handle them

## Out of Scope
- What this feature explicitly does NOT include
```

### Template: `context.md`

```markdown
# [Feature Name] - Implementation Context

**Last Updated**: YYYY-MM-DD HH:MM
**Current Status**: [Brief 1-line status]

## Key Files Modified
- `path/to/file1.js` - [What was changed]
- `path/to/file2.js` - [What was changed]

## Implementation Decisions
1. **[Decision Topic]** (Date: YYYY-MM-DD)
   - Decision: [What was decided]
   - Rationale: [Why]
   - Impact: [Consequences]

## Deviations from Plan
- **[What changed]**: [Why it changed from original plan]

## Current State
- What's been completed
- What's in progress
- What remains

## Known Issues / Blockers
- Issue 1: [Description and current status]

## Dependencies
- External libraries added
- Other systems this depends on

## Next Steps (Update before context compaction!)
1. Immediate next action
2. Second action
3. Third action
```

### Template: `tasks.md`

```markdown
# [Feature Name] - Task Checklist

**Last Updated**: YYYY-MM-DD HH:MM

## Phase 1: Setup
- [ ] Create necessary files/folders
- [ ] Install dependencies (if needed)

## Phase 2: Core Implementation
- [ ] Task 1
- [ ] Task 2
  - [ ] Sub-task 2.1
  - [ ] Sub-task 2.2
- [ ] Task 3

## Phase 3: Integration
- [ ] Integrate with System A
- [ ] Update state management
- [ ] Connect UI components

## Phase 4: Testing
- [ ] Unit tests for Component X
- [ ] Integration test for Feature Y
- [ ] Manual testing checklist
  - [ ] Test case 1
  - [ ] Test case 2

## Phase 5: Documentation
- [ ] Update API documentation
- [ ] Update user-facing docs
- [ ] Add code comments

## Phase 6: Cleanup
- [ ] Remove debug code
- [ ] Code review
- [ ] Performance check

## Discovered Tasks (add as you find them)
- [ ] Task discovered during implementation

## Completed ✓
- [x] Example completed task
```

---

## Example: Real Feature Structure

```
docs/dev/active/
└── state-persistence/
    ├── plan.md          # Approved: Use LocalStorage with Zustand persist middleware
    ├── context.md       # Modified: gameStore.js, matchStore.js, squadStore.js
    └── tasks.md         # 15/20 tasks complete, next: implement save/load UI
```

## Tips for Success

1. **Start with templates**: Don't create from scratch, use templates
2. **Update continuously**: Small frequent updates > large infrequent ones
3. **Be specific**: "Modified BattingCalculator.js line 45-67" > "Changed batting logic"
4. **Document WHY**: Future Claude needs context for decisions
5. **Keep tasks granular**: Large tasks → multiple sub-tasks
6. **Review plan.md when stuck**: Ensure you're still aligned with original goal

---

**Remember**: This system only works if you use it consistently. Future Claude sessions depend on these files to maintain continuity!
