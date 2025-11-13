# Team and Role Assets - Planned Feature

**Status**: Planned (Not Started)
**Priority**: Medium-High
**Estimated Effort**: 14-19 hours
**Dependencies**: None (independent feature)
**Scope**: Game-wide (affects 20+ components across all major screens)

## Overview

Create visual assets for game-wide use: **Team Logos** (10 SVG emblems for WPL teams), **Player Role Icons** (4 SVG icons for batting/bowling roles), and optionally **Country Flags** (for player nationality display). These assets will replace placeholder colored circles and text badges with professional, visually distinctive graphics throughout the entire game (matchday, squad, transfers, auction, league tables, player cards, etc.).

## Motivation

**Current State**:
- Teams represented by solid colored circles using `team.colors.primary` across all screens
- Player roles shown as text badges only (batsman, bowler, all-rounder, keeper)
- No visual distinction between teams beyond color
- Generic appearance lacks character and team identity throughout the game

**Desired State**:
- Professional team logos/emblems for all 10 WPL teams used consistently everywhere
- Distinctive role icons that are instantly recognizable across all interfaces
- Enhanced visual hierarchy and brand identity game-wide
- More immersive, polished experience across all game modes

**Benefits**:
- Improved visual recognition of teams across all screens (squad, auction, league, matchday)
- Faster player role identification in lineups, transfers, and squad management
- Enhanced professional aesthetic game-wide
- Better alignment with Football Manager design philosophy
- Consistent branding across home screen, league tables, match previews, and results
- Foundation for future branding features (team kits, stadium graphics, animated intros)

## Asset Requirements

### 1. Team Logos (10 SVG Files)

Create logos for all 10 World Premier League teams:

1. **Mumbai Thunders** (MUM)
   - Primary: #004BA0 (Deep Blue)
   - Secondary: #FFD700 (Gold)
   - Suggested theme: Lightning bolt, thunder imagery

2. **London Lions** (LON)
   - Primary: #C8102E (Red)
   - Secondary: #012169 (Navy Blue)
   - Suggested theme: Lion, British royal imagery

3. **Melbourne Meteors** (MEL)
   - Primary: #00843D (Green)
   - Secondary: #FFD100 (Gold)
   - Suggested theme: Meteor, southern star constellation

4. **Cape Town Crusaders** (CPT)
   - Primary: #007A3D (Green)
   - Secondary: #FFB81C (Gold)
   - Suggested theme: Shield, protea flower

5. **Karachi Kings** (KAR)
   - Primary: #006341 (Green)
   - Secondary: #FFFFFF (White)
   - Suggested theme: Crown, crescent moon

6. **Colombo Cobras** (COL)
   - Primary: #002D62 (Navy)
   - Secondary: #FFA500 (Orange)
   - Suggested theme: Cobra, lotus flower

7. **Dhaka Dynamites** (DHA)
   - Primary: #DC143C (Crimson)
   - Secondary: #006A4E (Green)
   - Suggested theme: Dynamite, tiger

8. **Kingston Storm** (KIN)
   - Primary: #009B3A (Green)
   - Secondary: #FCD116 (Gold)
   - Suggested theme: Hurricane, waves

9. **Wellington Warriors** (WEL)
   - Primary: #000000 (Black)
   - Secondary: #FFFFFF (White)
   - Suggested theme: Warrior, silver fern

10. **Kabul Eagles** (KAB)
    - Primary: #D32011 (Red)
    - Secondary: #000000 (Black)
    - Suggested theme: Eagle, mountain peaks

**Logo Specifications**:
- **Format**: SVG (scalable vector graphics)
- **Size**: Designed for 48x48px base, scalable to 256x256px
- **Style**: Minimalist, flat design (no gradients, max 3 colors)
- **Color palette**: Use team primary + secondary colors from `wpl_clubs.json`
- **Variants**: Two versions per team
  - Full logo: Emblem with team icon/mascot
  - Badge: Simplified circular badge (for compact spaces)
- **Naming convention**: `{team_id}_logo.svg`, `{team_id}_badge.svg`
- **Location**: `src/assets/teams/logos/`

### 2. Player Role Icons (4 SVG Files)

Create role icons for player positions:

1. **Batsman Icon**
   - Symbol: Cricket bat (vertical or diagonal)
   - Color: Blue (#3B82F6) for consistency with existing badges
   - Usage: Batting order displays, lineup screens

2. **Bowler Icon**
   - Symbol: Cricket ball with seam
   - Color: Red (#EF4444) for consistency with existing badges
   - Usage: Bowling plans, bowler lists

3. **All-Rounder Icon**
   - Symbol: Combined bat + ball (crossed or overlapping)
   - Color: Purple (#A855F7) for consistency with existing badges
   - Usage: Squad displays, tactical selections

4. **Wicket-Keeper Icon**
   - Symbol: Wicket-keeping gloves or stumps + gloves
   - Color: Green (#10B981) for consistency with existing badges
   - Usage: Lineup displays, squad selections

**Icon Specifications**:
- **Format**: SVG (scalable vector graphics)
- **Size**: Designed for 16x16px base, scalable to 32x32px
- **Style**: Minimalist, line-based (2px stroke weight)
- **Variants**: Two styles
  - Filled: Solid fill with color (for emphasis)
  - Outlined: Stroke only (for compact displays)
- **Naming convention**: `{role}_filled.svg`, `{role}_outlined.svg`
  - Examples: `batsman_filled.svg`, `bowler_outlined.svg`
- **Location**: `src/assets/icons/roles/`

### 3. Country Flags (Optional Enhancement)

**Scope**: 20-30 country flags for player nationalities

**Specifications**:
- **Format**: SVG (4:3 ratio)
- **Size**: 24x18px base
- **Style**: Flat, simplified (no complex patterns or emblems)
- **Source**: Use existing open-source flag libraries (e.g., `flag-icons`)
- **Location**: `src/assets/icons/flags/`

**Decision**: Defer to future phase (low priority, third-party libraries available)

## Design Guidelines

### Visual Style
- **Aesthetic**: Football Manager meets Cricket - professional, data-dense, clean
- **Design language**: Minimalist flat design, no skeuomorphism
- **Color usage**: Respect team colors, use design system accents (Cricket Green, Trophy Gold)
- **Consistency**: All assets should feel like part of the same visual family

### Technical Constraints
- **File size**: Each SVG < 10KB (optimize paths, remove unnecessary metadata)
- **Accessibility**: Ensure sufficient contrast (WCAG AA standard)
- **Performance**: SVGs should render instantly (< 10ms)
- **Browser support**: Compatible with Chrome, Edge, Firefox, Safari

### Asset Quality Standards
- **Scalability**: Crisp at all sizes (16px to 256px)
- **Simplicity**: Recognizable at small sizes (24x24px)
- **Distinctiveness**: Each team logo visually unique at a glance
- **Professionalism**: Polished, not amateur or clipart-like

## Implementation Approach

### Phase 1: Design & Creation (6-8 hours)

**Team Logos**:
1. Research cricket team logo design patterns (IPL, BBL, CPL for inspiration)
2. Sketch concepts for each team (theme + iconography)
3. Create SVG files in vector editor (Figma, Illustrator, or Inkscape)
4. Optimize SVGs (remove unnecessary paths, minimize file size)
5. Export two variants per team (full logo, badge)

**Role Icons**:
1. Sketch icon concepts (bat, ball, bat+ball, gloves)
2. Create SVG files with consistent stroke weight (2px)
3. Export two variants per role (filled, outlined)

**Tools**:
- Figma (recommended, free tier available)
- Adobe Illustrator (if available)
- Inkscape (free, open-source alternative)
- SVGO (command-line tool for SVG optimization)

### Phase 2: Integration (5-7 hours)

**Create asset management system**:

1. **Create asset directory structure**:
   ```
   src/assets/
   ├── teams/
   │   ├── logos/
   │   │   ├── mumbai_thunders_logo.svg
   │   │   ├── mumbai_thunders_badge.svg
   │   │   └── ... (20 files total)
   │   └── index.js (export all team assets)
   └── icons/
       ├── roles/
       │   ├── batsman_filled.svg
       │   ├── batsman_outlined.svg
       │   └── ... (8 files total)
       └── index.js (export all icon assets)
   ```

2. **Create React components**:
   - `TeamLogo.jsx` - Display team logo with size variants
   - `TeamBadge.jsx` - Display compact team badge
   - `RoleIcon.jsx` - Display player role icon with style variants

3. **Update existing components** (20+ components game-wide):
   - **Matchday**: Replace colored circles in HUD, PreMatchFlow, MatchScoreDisplay with badges/logos
   - **Squad & Tactics**: Replace text badges with `<RoleIcon />` in Squad, TacticsPage, BattingOrderTab
   - **League**: Replace colored circles with `<TeamBadge />` in League, Matches, SeasonProgress
   - **Transfers & Auction**: Replace colored circles with `<TeamLogo />` in Auction, Transfers
   - **Cards**: Replace circles/badges with logos/icons in PlayerCard, TeamCard, modals
   - **Home & Navigation**: Add team branding to Header, Home dashboard
   - **Inbox & Results**: Replace plain text with badges/logos in Inbox, MatchResultModal

4. **Add fallback logic**:
   - If asset fails to load → fallback to colored circle/text badge
   - Graceful degradation for missing assets

### Phase 3: Testing & Polish (2-3 hours)

1. **Visual testing**:
   - Test all logos at multiple sizes (24px, 48px, 64px, 128px)
   - Verify role icons readable at 16px
   - Check color contrast on dark background

2. **Performance testing**:
   - Measure asset load times
   - Verify no layout shifts when assets load
   - Check memory usage with all assets loaded

3. **Browser testing**:
   - Test SVG rendering in Chrome, Edge, Firefox
   - Verify no rendering issues or quirks

4. **Accessibility testing**:
   - Add ARIA labels to all logos/icons
   - Ensure alt text provided for screen readers
   - Verify keyboard navigation still works

## Integration Points

### Components to Modify (Game-Wide)

**1. Matchday UI**

**HUD (MatchdayUI.jsx)**:
```jsx
// Before
<div className="w-8 h-8 rounded-full" style={{ backgroundColor: team.colors.primary }} />

// After
<TeamBadge teamId={team.id} size="sm" />
```

**Pre-Match Flow (PreMatchFlow.jsx, LineupsTab.jsx)**:
```jsx
// Before
<div className="w-16 h-16 rounded-full" style={{ backgroundColor: team.colors.primary }} />

// After
<TeamLogo teamId={team.id} size="md" />
```

**Tactics Hub (BattingAccelerationPanel.jsx, LineupsTab.jsx)**:
```jsx
// Before
<span className="px-2 py-1 text-xs rounded bg-blue-500/20 text-blue-400">Batsman</span>

// After
<RoleIcon role="batsman" variant="filled" size="sm" className="inline" />
```

**2. Squad & Team Management**

**Squad Page (Squad.jsx)**:
```jsx
// Before: Player role badges
<span className="badge">{player.role}</span>

// After: Role icons
<RoleIcon role={player.role} variant="outlined" size="sm" />
```

**Tactics Page (TacticsPage.jsx, BattingOrderTab.jsx)**:
```jsx
// Before: Text badges for roles
<span className="role-badge">{player.role}</span>

// After: Role icons
<RoleIcon role={player.role} variant="filled" size="xs" />
```

**3. League & Competition Screens**

**League Table (League.jsx)**:
```jsx
// Before: Colored circles
<div className="team-badge" style={{ backgroundColor: team.colors.primary }} />

// After: Team badges
<TeamBadge teamId={team.id} size="xs" />
```

**Matches List (Matches.jsx)**:
```jsx
// Before: Team names with colored backgrounds
<div className="team-section" style={{ backgroundColor: team.colors.primary }}>
  {team.shortName}
</div>

// After: Team badges with names
<TeamBadge teamId={team.id} size="sm" />
<span>{team.shortName}</span>
```

**4. Transfers & Auction**

**Auction Screen (Auction.jsx)**:
```jsx
// Before: Colored circles for teams
<div className="team-circle" style={{ backgroundColor: team.colors.primary }} />

// After: Team logos
<TeamLogo teamId={team.id} size="md" />
```

**Transfers Screen (Transfers.jsx)**:
```jsx
// Before: Plain team names
<span>{team.name}</span>

// After: Team badges + names
<TeamBadge teamId={team.id} size="sm" />
<TeamName teamId={team.id} />
```

**5. Player & Team Cards**

**Player Cards (PlayerCardModal.jsx, PlayerCard.jsx)**:
```jsx
// Before: Role text badge
<span className="px-2 py-1 text-xs rounded bg-blue-500/20 text-blue-400">{player.role}</span>

// After: Role icon + text
<RoleIcon role={player.role} variant="outlined" size="md" />
<span className="text-sm text-secondary">{player.role}</span>
```

**Team Cards (TeamCardModal.jsx, TeamCard.jsx)**:
```jsx
// Before: Large colored circle
<div className="w-24 h-24 rounded-full" style={{ backgroundColor: team.colors.primary }} />

// After: Team logo
<TeamLogo teamId={team.id} size="xl" />
```

**6. Home Screen & Navigation**

**Home Dashboard (Home.jsx)**:
```jsx
// Before: User team shown as colored circle
<div className="user-team-badge" style={{ backgroundColor: userTeam.colors.primary }} />

// After: User team logo
<TeamLogo teamId={userTeam.id} size="lg" />
```

**Header (Header.jsx)**:
```jsx
// Before: Team name only
<span>{userTeam.shortName}</span>

// After: Team badge + name
<TeamBadge teamId={userTeam.id} size="xs" />
<span>{userTeam.shortName}</span>
```

**7. Match Results & Inbox**

**Match Result Modal (MatchResultModal.jsx)**:
```jsx
// Before: Colored circles for both teams
<div className="team-logo" style={{ backgroundColor: team.colors.primary }} />

// After: Team logos
<TeamLogo teamId={team.id} size="lg" />
```

**Inbox Messages (Inbox.jsx, MessagePreview.jsx)**:
```jsx
// Before: Plain team names in messages
<span>Transfer offer from {team.name}</span>

// After: Team badge + name
<TeamBadge teamId={team.id} size="xs" />
<span>Transfer offer from <TeamName teamId={team.id} /></span>
```

### New Components to Create

**TeamLogo.jsx**:
```jsx
/**
 * Display team logo with size variants
 * @param {string} teamId - Team identifier (e.g., 'mumbai_thunders')
 * @param {string} size - Size variant ('sm' | 'md' | 'lg' | 'xl')
 * @param {string} className - Additional CSS classes
 */
```

**TeamBadge.jsx**:
```jsx
/**
 * Display compact team badge (circular variant)
 * @param {string} teamId - Team identifier
 * @param {string} size - Size variant ('xs' | 'sm' | 'md' | 'lg')
 * @param {boolean} showTooltip - Show team name on hover
 */
```

**RoleIcon.jsx**:
```jsx
/**
 * Display player role icon with style variants
 * @param {string} role - Player role ('batsman' | 'bowler' | 'all-rounder' | 'wicket-keeper')
 * @param {string} variant - Style variant ('filled' | 'outlined')
 * @param {string} size - Size variant ('xs' | 'sm' | 'md' | 'lg')
 */
```

### Asset Loading Strategy

**Option 1: Static Imports** (Recommended)
```javascript
// src/assets/teams/index.js
import MumbaiLogo from './logos/mumbai_thunders_logo.svg';
import MumbaiBadge from './logos/mumbai_thunders_badge.svg';
// ... (repeat for all teams)

export const teamAssets = {
  mumbai_thunders: {
    logo: MumbaiLogo,
    badge: MumbaiBadge
  },
  // ... (repeat for all teams)
};
```

**Option 2: Dynamic Imports** (For lazy loading)
```javascript
// Load logo on demand
const logo = await import(`@/assets/teams/logos/${teamId}_logo.svg`);
```

**Decision**: Use static imports for team assets (always needed), dynamic imports for flags (rarely used)

## Success Criteria

### Visual Quality
- ✅ All 10 team logos are distinctive and recognizable at 24px size
- ✅ Team colors accurately represented in logos
- ✅ Role icons clearly identifiable at 16px size
- ✅ All assets maintain quality when scaled up to 256px
- ✅ Logos/icons look professional (not amateur or clipart-like)

### Technical Performance
- ✅ Each SVG file < 10KB
- ✅ All assets load in < 100ms total
- ✅ No layout shifts when assets load
- ✅ Fallback to colored circles/badges works gracefully

### Integration (Game-Wide)
- ✅ **Matchday UI**: HUD displays team badges, pre-match screens show full logos
- ✅ **Squad & Tactics**: Role icons displayed in lineups, batting order, squad page
- ✅ **League Screens**: Team badges in league table, matches list, standings
- ✅ **Transfers & Auction**: Team logos in auction screen, team badges in transfers
- ✅ **Player/Team Cards**: Role icons in player cards, team logos in team cards
- ✅ **Home & Navigation**: Team logo in header, dashboard uses team branding
- ✅ **Match Results & Inbox**: Team logos in result modals, badges in messages
- ✅ **Consistency**: Assets used uniformly across all 20+ game screens
- ✅ **Functionality**: All existing clickable behavior preserved (TeamName, PlayerName components)

### Accessibility
- ✅ All logos have descriptive alt text
- ✅ Color contrast meets WCAG AA standards
- ✅ Screen readers announce team names correctly
- ✅ Keyboard navigation unaffected

## Future Enhancements

**Phase 2 - Advanced Team Branding**:
- Team kits/jerseys (colored uniforms in pitch visualization)
- Stadium backgrounds (home venue graphics)
- Team-specific celebrations (wicket animations)
- Dynamic team colors in UI elements

**Phase 3 - Player Avatars**:
- Procedurally generated player faces
- Player silhouettes based on batting/bowling stance
- Photo placeholders for career mode

**Phase 4 - Animated Assets**:
- Animated team logo intros (match start)
- Icon animations (role icon transitions)
- Victory celebrations (team logo + fireworks)

## Design Resources

### Inspiration Sources
- **IPL Team Logos**: Mumbai Indians, Chennai Super Kings (professional cricket branding)
- **BBL Team Logos**: Melbourne Stars, Sydney Thunder (Australian T20 league)
- **Football Manager**: Club badges, competition logos (data-dense aesthetic)
- **Sports Logos**: NBA, NFL, EPL (minimalist, iconic design)

### Color Palette Reference
From `wpl_clubs.json`:
```javascript
{
  mumbai_thunders: { primary: '#004BA0', secondary: '#FFD700' },
  london_lions: { primary: '#C8102E', secondary: '#012169' },
  melbourne_meteors: { primary: '#00843D', secondary: '#FFD100' },
  cape_town_crusaders: { primary: '#007A3D', secondary: '#FFB81C' },
  karachi_kings: { primary: '#006341', secondary: '#FFFFFF' },
  colombo_cobras: { primary: '#002D62', secondary: '#FFA500' },
  dhaka_dynamites: { primary: '#DC143C', secondary: '#006A4E' },
  kingston_storm: { primary: '#009B3A', secondary: '#FCD116' },
  wellington_warriors: { primary: '#000000', secondary: '#FFFFFF' },
  kabul_eagles: { primary: '#D32011', secondary: '#000000' }
}
```

### Tool Resources
- **Figma** (https://figma.com) - Free vector design tool
- **Inkscape** (https://inkscape.org) - Free, open-source SVG editor
- **SVGO** (https://github.com/svg/svgo) - SVG optimization tool
- **SVG OMG** (https://jakearchibald.github.io/svgomg/) - Web-based SVG optimizer
- **Lucide Icons** (https://lucide.dev) - Icon library for inspiration

## Risk Assessment

### Medium Risk
- **Design quality**: Creating 10 professional logos requires design skill
  - Mitigation: Use design templates, seek feedback, iterate
- **File size**: Complex logos may exceed 10KB limit
  - Mitigation: Optimize paths, use SVGO, simplify designs

### Low Risk
- **Integration complexity**: SVG integration is straightforward
- **Performance impact**: Minimal (SVGs are lightweight)
- **Browser compatibility**: SVG widely supported

## Estimated Timeline

- **Design & Creation**: 6-8 hours
  - Team logo concepts: 2 hours
  - SVG creation (10 teams × 2 variants): 3-4 hours
  - Role icon creation (4 roles × 2 variants): 1 hour
  - Optimization & export: 1 hour

- **Integration**: 5-7 hours (game-wide integration)
  - Asset directory setup: 30 minutes
  - Component creation (TeamLogo, TeamBadge, RoleIcon): 1.5 hours
  - Update existing components (20+ components): 3-4 hours
  - Fallback logic: 30 minutes
  - Cross-screen testing: 30 minutes

- **Testing & Polish**: 3-4 hours
  - Visual testing (all screens): 1.5 hours
  - Performance testing: 30 minutes
  - Browser testing: 30 minutes
  - Accessibility testing: 1 hour

**Total**: 14-19 hours

## Dependencies

### Prerequisites
- Matchday UI Polish feature complete (for integration points)
- Design tool available (Figma, Illustrator, or Inkscape)
- Basic SVG/vector design skills

### Blockers
- None (can proceed independently)

## Notes

- **Priority**: Medium-High (visual enhancement that significantly improves game-wide UX)
- **Complexity**: Medium (design skill required for assets, integration is straightforward but extensive)
- **Impact**: Very High (transforms visual identity across entire game, not just matchday)
- **Reusability**: Very High (assets reused across 20+ components in all major game screens)
- **Scope**: Game-wide feature affecting matchday, squad, tactics, league, transfers, auction, inbox, and home screens

## References

- **Team Data**: `src/data/clubs/wpl_clubs.json`
- **Player Data**: `src/data/players/master_player_database.json` (role field)
- **Existing Components**: `PlayerName.jsx`, `TeamName.jsx`, `PlayerCardModal.jsx`, `TeamCardModal.jsx`
- **Design System**: `docs/frontend/design-system.md`
- **Component Locations**:
  - Matchday: `src/components/match/matchday/`
  - Squad: `src/components/team/Squad.jsx`
  - Tactics: `src/components/tactics/`
  - League: `src/components/layout/League.jsx`
  - Auction: `src/components/auction/Auction.jsx`
  - Transfers: `src/components/layout/Transfers.jsx`
  - Home: `src/components/layout/Home.jsx`
  - Inbox: `src/components/inbox/`
