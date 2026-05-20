/**
 * @file reporters.js
 * @description Reporter persona pool used as bylines on news articles. Real
 * cricket commentators / writers are paraphrased in tribute — each persona has
 * a name, a one-line tagline (rendered under the headline / on the carousel
 * card sidebar), and a list of preferred event beats so high-profile matches
 * draw the right voice.
 *
 * No persona phrasings appear in the body text — that's the legacyEcho block's
 * job (and only with attribution). Personas here are bylines + bio only.
 *
 * @module core/news/reporters
 */

/**
 * @typedef {Object} Reporter
 * @property {string} id
 * @property {string} name        — Byline as it appears on the article
 * @property {string} tagline     — Short bio for the masthead/sidebar
 * @property {string[]} beats     — Event types / payload tags this persona prefers
 * @property {number} weight      — Relative pick weight when multiple match
 */

const REPORTERS = [
  {
    id: 'harsha-bhogle',
    name: 'Harsha Bhogle',
    tagline: 'Voice of the WPL — statistical mind, cricketer’s heart',
    beats: ['match.result', 'season.opener', 'milestone', 'champion'],
    weight: 3
  },
  {
    id: 'jarrod-kimber',
    name: 'Jarrod Kimber',
    tagline: 'Long-form cricket writer — the form guide quietly rewritten',
    beats: ['transfer.completed', 'one_sided', 'upset', 'weekly.roundup'],
    weight: 3
  },
  {
    id: 'sid-monga',
    name: 'Sid Monga',
    tagline: 'Tactical eye, measured prose — the cricket beneath the cricket',
    beats: ['close_finish', 'tactical', 'bowling', 'match.result'],
    weight: 3
  },
  {
    id: 'sanjay-manjrekar',
    name: 'Sanjay Manjrekar',
    tagline: 'Technical observer — batters and the choices they make',
    beats: ['match.result', 'batting', 'milestone'],
    weight: 2
  },
  {
    id: 'ian-bishop',
    name: 'Ian Bishop',
    tagline: 'Big-moment voice — the broadcast roar that lives forever',
    beats: ['playoff.champion_crowned', 'final', 'isPlayoff', 'close_finish'],
    weight: 3
  },
  {
    id: 'mark-nicholas',
    name: 'Mark Nicholas',
    tagline: 'Cricket’s poet laureate — scene set, mood drawn',
    beats: ['season.opener', 'playoff.champion_crowned', 'final', 'champion'],
    weight: 2
  },
  {
    id: 'richie-benaud',
    name: 'Richie Benaud',
    tagline: 'In tribute — the laconic master, fewer words, more meaning',
    beats: ['one_sided', 'tactical'],
    weight: 1
  },
  {
    id: 'naya-singh',
    name: 'Naya Singh',
    tagline: 'WPL beat reporter — every match, every season, every word',
    beats: ['*'],
    weight: 2
  }
];

function tagsFromEvent(event) {
  const tags = new Set();
  if (event?.type) tags.add(event.type);
  const p = event?.payload || {};
  if (p.isPlayoff) tags.add('isPlayoff');
  if (p.isCloseFinish) tags.add('close_finish');
  if (p.isOneSided) tags.add('one_sided');
  if (p.isMarquee) tags.add('marquee');
  if (p.stageLabel === 'Final') tags.add('final');
  return tags;
}

/**
 * Pick a reporter for an event. Personas whose beats overlap the event tags
 * are weighted; if none overlap we draw from the universal pool.
 *
 * @param {Object} event - Enriched news event
 * @returns {Reporter}
 */
export function pickReporter(event) {
  const tags = tagsFromEvent(event);
  // Build a weighted list — each reporter gets `weight` slots multiplied by
  // (1 + #matching beats), and the universal '*' personas always show up.
  const slots = [];
  for (const r of REPORTERS) {
    let matchCount = 0;
    for (const beat of r.beats) {
      if (beat === '*' || tags.has(beat)) matchCount += 1;
    }
    if (matchCount === 0) continue;
    const factor = r.weight * (matchCount + 1);
    for (let i = 0; i < factor; i += 1) slots.push(r);
  }
  if (slots.length === 0) {
    // Defensive fallback — shouldn't happen because Naya Singh has '*'
    return REPORTERS[REPORTERS.length - 1];
  }
  return slots[Math.floor(Math.random() * slots.length)];
}

/**
 * Look up a reporter by id (used by NewsArticleModal to read the tagline
 * from a persisted byline).
 */
export function getReporterById(id) {
  return REPORTERS.find(r => r.id === id) || null;
}

export default REPORTERS;
