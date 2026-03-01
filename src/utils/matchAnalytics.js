/**
 * matchAnalytics.js
 * Computes rich analytics from ball-by-ball match data.
 * Used by Match Analysis Drawer, Player Card, and Tactics Recommendations.
 */

const PHASES = ['powerplay', 'earlyMiddle', 'lateMiddle', 'death'];

/**
 * Creates an empty stats bucket.
 */
function emptyStats() {
  return { runs: 0, balls: 0, wickets: 0, fours: 0, sixes: 0, dots: 0 };
}

/**
 * Accumulate a ball result into a stats bucket.
 * @param {Object} bucket
 * @param {Object} ball
 */
function accumulateBall(bucket, ball) {
  const runs = ball.runs || 0;
  bucket.runs += runs;
  bucket.balls += 1;
  if (ball.isWicket) bucket.wickets += 1;
  if (runs === 4) bucket.fours += 1;
  if (runs === 6) bucket.sixes += 1;
  if (runs === 0 && !ball.isWicket) bucket.dots += 1;
}

/**
 * Get or create a nested key in a map (keyed by stringified filter).
 */
function getOrCreate(map, key, factory) {
  if (!map[key]) map[key] = factory();
  return map[key];
}

/**
 * Compute full analytics from a ball-by-ball array.
 * @param {Array} ballByBall - All balls from the match (both innings, tagged with analytics fields)
 * @param {Object} matchResult - The match result object (for battingTeam/bowlingTeam per innings)
 * @returns {Object} analytics object
 */
export function computeMatchAnalytics(ballByBall, matchResult) {
  if (!ballByBall || !ballByBall.length) return null;

  // Group balls by innings number
  const byInnings = {};
  for (const ball of ballByBall) {
    const num = ball.innings || 1;
    if (!byInnings[num]) byInnings[num] = [];
    byInnings[num].push(ball);
  }

  const innings = [];

  for (const [inningsNumStr, balls] of Object.entries(byInnings)) {
    const inningsNumber = parseInt(inningsNumStr, 10);

    // Determine batting/bowling teams from result if available
    const inningsKey = inningsNumber === 1 ? 'innings1' : 'innings2';
    const battingTeamId = matchResult?.[inningsKey]?.battingTeam || null;
    const bowlingTeamId = matchResult?.[inningsKey]?.bowlingTeam || null;

    // Team-level phase summary
    const phases = {};
    for (const phase of PHASES) {
      phases[phase] = emptyStats();
    }

    // Innings-level wagon zones: key = `${phase}:${zone}`
    const wagonZoneMap = {};

    // Per-player data
    const players = {};

    for (const ball of balls) {
      const phase = ball.phase || 'earlyMiddle';
      const zone = ball.hitZone || 'midOn';
      const strikerId = ball.striker;
      const bowlerId = ball.bowler;

      // Team phase
      if (phases[phase]) accumulateBall(phases[phase], ball);

      // Team wagon zone
      const wzKey = `${phase}:${zone}`;
      if (!wagonZoneMap[wzKey]) {
        wagonZoneMap[wzKey] = { phase, zone, ...emptyStats() };
      }
      accumulateBall(wagonZoneMap[wzKey], ball);

      // ---- Batter stats ----
      if (strikerId) {
        if (!players[strikerId]) {
          players[strikerId] = { batting: {}, bowling: {}, wagonZones: {}, fielding: { catches: 0, runOuts: 0, misfieldRuns: 0 } };
        }
        const pData = players[strikerId];
        const batKey = `${phase}:${ball.strikerPlaystyle || 'unknown'}:${ball.strikerTier || 'unknown'}`;
        if (!pData.batting[batKey]) {
          pData.batting[batKey] = { phase, playstyle: ball.strikerPlaystyle, tier: ball.strikerTier, runs: 0, balls: 0, dismissed: 0, fours: 0, sixes: 0 };
        }
        const bkt = pData.batting[batKey];
        bkt.runs += ball.runs || 0;
        bkt.balls += 1;
        if (ball.isWicket && ball.dismissedPlayer === strikerId) bkt.dismissed += 1;
        if ((ball.runs || 0) === 4) bkt.fours += 1;
        if ((ball.runs || 0) === 6) bkt.sixes += 1;

        // Batter wagon zone
        const bWzKey = `${phase}:${zone}`;
        if (!pData.wagonZones[bWzKey]) {
          pData.wagonZones[bWzKey] = { phase, zone, runs: 0, balls: 0, fours: 0, sixes: 0 };
        }
        const bWz = pData.wagonZones[bWzKey];
        bWz.runs += ball.runs || 0;
        bWz.balls += 1;
        if ((ball.runs || 0) === 4) bWz.fours += 1;
        if ((ball.runs || 0) === 6) bWz.sixes += 1;
      }

      // ---- Bowler stats ----
      if (bowlerId) {
        if (!players[bowlerId]) {
          players[bowlerId] = { batting: {}, bowling: {}, wagonZones: {}, fielding: { catches: 0, runOuts: 0, misfieldRuns: 0 } };
        }
        const pData = players[bowlerId];
        const bowlKey = `${phase}:${ball.bowlerPlaystyle || 'unknown'}:${ball.bowlerPlan || 'unknown'}`;
        if (!pData.bowling[bowlKey]) {
          pData.bowling[bowlKey] = { phase, playstyle: ball.bowlerPlaystyle, plan: ball.bowlerPlan, runs: 0, balls: 0, wickets: 0, dots: 0 };
        }
        const bbkt = pData.bowling[bowlKey];
        bbkt.runs += ball.runs || 0;
        bbkt.balls += 1;
        if (ball.isWicket && ball.dismissedPlayer !== bowlerId) bbkt.wickets += 1;
        if ((ball.runs || 0) === 0 && !ball.isWicket) bbkt.dots += 1;
      }

      // ---- Fielding stats ----
      if (ball.isWicket && ball.dismissalType === 'caught' && ball.fielderId) {
        if (!players[ball.fielderId]) {
          players[ball.fielderId] = { batting: {}, bowling: {}, wagonZones: {}, fielding: { catches: 0, runOuts: 0, misfieldRuns: 0 } };
        }
        players[ball.fielderId].fielding.catches += 1;
      }
      if (ball.isWicket && ball.dismissalType === 'runOut' && ball.fielderId) {
        if (!players[ball.fielderId]) {
          players[ball.fielderId] = { batting: {}, bowling: {}, wagonZones: {}, fielding: { catches: 0, runOuts: 0, misfieldRuns: 0 } };
        }
        players[ball.fielderId].fielding.runOuts += 1;
      }
    }

    // Convert player maps from keyed objects to arrays
    const playersArrayed = {};
    for (const [pid, pData] of Object.entries(players)) {
      playersArrayed[pid] = {
        batting: Object.values(pData.batting),
        bowling: Object.values(pData.bowling),
        wagonZones: Object.values(pData.wagonZones),
        fielding: pData.fielding
      };
    }

    innings.push({
      inningsNumber,
      battingTeamId,
      bowlingTeamId,
      phases,
      wagonZones: Object.values(wagonZoneMap),
      players: playersArrayed
    });
  }

  return { innings };
}

/**
 * Filter and aggregate segments from analytics.
 * @param {Array} segments - Array of stat objects (batting[], bowling[], wagonZones[])
 * @param {Object} filter - Partial object with keys to match (e.g. { phase: 'powerplay' })
 * @returns {Object} Aggregated stats
 */
export function aggregateStats(segments, filter = {}) {
  if (!segments || !segments.length) return emptyStats();

  const filtered = segments.filter(seg => {
    return Object.entries(filter).every(([k, v]) => seg[k] === v);
  });

  const result = { ...emptyStats() };
  for (const seg of filtered) {
    result.runs += seg.runs || 0;
    result.balls += seg.balls || 0;
    result.wickets += (seg.wickets || seg.dismissed || 0);
    result.fours += seg.fours || 0;
    result.sixes += seg.sixes || 0;
    result.dots += seg.dots || 0;
  }
  return result;
}

/**
 * Generate plain-text insight cards for the Tactics Recommendations panel.
 * @param {Object} analytics - Output of computeMatchAnalytics()
 * @param {string} userTeamId - The user's team ID
 * @param {Object} thresholds - Threshold config (from insight-thresholds.json)
 * @returns {Array<{title: string, body: string, type: string}>}
 */
export function generateInsights(analytics, userTeamId, thresholds = {}) {
  if (!analytics || !analytics.innings) return [];

  const insights = [];
  const {
    wagonZoneLeak = 0.35,
    deathEconomy = 9.5,
    powerplayEconomy = 8.0,
    lowStrikeRateVsSpin = 110
  } = thresholds;

  for (const innings of analytics.innings) {
    const isBowlingInnings = innings.bowlingTeamId === userTeamId;
    const isBattingInnings = innings.battingTeamId === userTeamId;

    // ---- Wagon zone leak (when bowling) ----
    if (isBowlingInnings) {
      const deathZones = innings.wagonZones.filter(w => w.phase === 'death');
      const totalDeathRuns = deathZones.reduce((s, w) => s + (w.runs || 0), 0);
      if (totalDeathRuns > 0) {
        const sorted = [...deathZones].sort((a, b) => b.runs - a.runs);
        const top = sorted[0];
        if (top && (top.runs / totalDeathRuns) >= wagonZoneLeak) {
          const zoneName = formatZoneName(top.zone);
          insights.push({
            type: 'warning',
            title: 'Death Overs: Zone Leak',
            body: `${Math.round((top.runs / totalDeathRuns) * 100)}% of death-over runs conceded went to ${zoneName}. Consider adjusting your field placement.`
          });
        }
      }

      // ---- Death economy ----
      const deathPhase = innings.phases.death;
      if (deathPhase && deathPhase.balls >= 6) {
        const econ = (deathPhase.runs / deathPhase.balls) * 6;
        if (econ > deathEconomy) {
          insights.push({
            type: 'warning',
            title: 'High Death Economy',
            body: `Your bowling conceded ${econ.toFixed(1)} per over in the death overs (threshold: ${deathEconomy}). Review your death bowling options.`
          });
        }
      }

      // ---- Powerplay economy ----
      const ppPhase = innings.phases.powerplay;
      if (ppPhase && ppPhase.balls >= 6) {
        const econ = (ppPhase.runs / ppPhase.balls) * 6;
        if (econ > powerplayEconomy) {
          insights.push({
            type: 'info',
            title: 'Powerplay Economy',
            body: `Powerplay economy was ${econ.toFixed(1)} RPO. Consider a more attacking field or switching bowlers early.`
          });
        }
      }
    }

    // ---- Batting insights ----
    if (isBattingInnings) {
      // Late middle strike rate
      const lmPhase = innings.phases.lateMiddle;
      if (lmPhase && lmPhase.balls >= 12) {
        const sr = lmPhase.balls > 0 ? (lmPhase.runs / lmPhase.balls) * 100 : 0;
        if (sr > lowStrikeRateVsSpin) {
          insights.push({
            type: 'positive',
            title: 'Strong Late-Middle Batting',
            body: `Your batters averaged SR ${Math.round(sr)} in overs 13–16 — a strong platform for the death overs.`
          });
        }
      }

      // Powerplay runs
      const ppPhase = innings.phases.powerplay;
      if (ppPhase && ppPhase.balls > 0) {
        const ppRPO = (ppPhase.runs / ppPhase.balls) * 6;
        if (ppRPO < 6.5) {
          insights.push({
            type: 'info',
            title: 'Powerplay: Below Average Start',
            body: `${ppRPO.toFixed(1)} RPO in the powerplay is below the WPL average (~8.3). Consider a more aggressive opening tier.`
          });
        }
      }
    }
  }

  return insights.slice(0, 5); // Return top 5 insights
}

/**
 * Format a zone key to a human-readable name.
 * @param {string} zone
 * @returns {string}
 */
function formatZoneName(zone) {
  const names = {
    fineLeg: 'Fine Leg',
    midWicket: 'Mid Wicket',
    midOn: 'Mid On',
    midOff: 'Mid Off',
    cover: 'Cover',
    point: 'Point'
  };
  return names[zone] || zone;
}
