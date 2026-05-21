/**
 * @file matchReport/famousQuotes.js
 * @description Curated pool of legendary cricket commentary lines, attributed
 * to real broadcasters via "as X once put it" framing. Used by the legacyEcho
 * block to sprinkle a homage paragraph into dramatic match reports.
 *
 * Quotes are scenario-tagged — the block picks a scenario based on payload
 * flags + scorecard signals, then picks a quote at random from that bucket.
 * Lines are paraphrased / quoted briefly under fair-use as cultural reference
 * within a sports-management simulation; attribution is explicit.
 *
 * @module core/news/renderers/matchReport/famousQuotes
 */

const QUOTES = {
  lastOverFinish: [
    {
      attribution: 'Ian Bishop',
      template: '“Carlos Brathwaite — remember the name!” Ian Bishop’s roar from Eden Gardens drifted back into the mind as the closing balls played out.'
    },
    {
      attribution: 'Ravi Shastri',
      template: 'Ravi Shastri’s famous “Dhoni finishes off in style” line felt fitting for the moment the winning runs landed.'
    },
    {
      attribution: 'Tony Cozier',
      template: 'There was a touch of Tony Cozier about it — the late voice of Caribbean cricket would have called this one a classic.'
    }
  ],
  bigSix: [
    {
      attribution: 'Ravi Shastri',
      template: 'It went, in Ravi Shastri’s phrase, “like a tracer bullet” — the kind of shot that empties stands and fills broadcasts.'
    },
    {
      attribution: 'Tony Greig',
      template: '“What a shot, what a shot,” Tony Greig used to say when a bat met a ball this purely.'
    }
  ],
  wicketStorm: [
    {
      attribution: 'Bill Lawry',
      template: '“Got him! Yes!” Bill Lawry’s celebratory cadence was the soundtrack as the wickets clattered.'
    },
    {
      attribution: 'Richie Benaud',
      template: 'Richie Benaud would have offered a single dry word — “marvellous” — and let the silence carry the rest.'
    }
  ],
  centuryMilestone: [
    {
      attribution: 'Harsha Bhogle',
      template: '“What a player, what a knock when it mattered most” — a line straight from Harsha Bhogle’s register, and fitting here.'
    }
  ],
  tightSpell: [
    {
      attribution: 'Mark Nicholas',
      template: 'Mark Nicholas would have built a whole essay around the spell — the precision, the patience, the way the captain set the field.'
    },
    {
      attribution: 'Sid Monga',
      template: 'As Sid Monga has written more than once: bowling like this bends a match’s spine without ever announcing itself.'
    }
  ],
  upsetWin: [
    {
      attribution: 'Jarrod Kimber',
      template: 'In a Jarrod Kimber column this is the kind of result that gets a wry first line — the form guide quietly rewritten while the league looked away.'
    }
  ],
  finalCrescendo: [
    {
      attribution: 'Ian Bishop',
      template: 'It was a Bishop-roar of a finish — the kind of broadcast moment that arrives once a season, if you’re lucky.'
    },
    {
      attribution: 'Mark Nicholas',
      template: 'Mark Nicholas, if he were calling it, would have reached for the poets — and might still have come up short.'
    }
  ]
};

/**
 * Pick a scenario tag from match payload + scorecard hooks. Highest-priority
 * scenario wins so we don't over-sprinkle (one homage per article, max).
 * @param {Object} payload
 * @param {Object} [hooks] - Optional precomputed signals (anchor type, etc.)
 */
export function pickScenario(payload, hooks = {}) {
  if (payload?.isPlayoff && payload?.stageLabel === 'Final') return 'finalCrescendo';
  if (payload?.isCloseFinish) return 'lastOverFinish';
  if (hooks.bigSixCount >= 6) return 'bigSix';
  if (hooks.wicketStormOver) return 'wicketStorm';
  if (hooks.anchorIsCentury) return 'centuryMilestone';
  if (hooks.anchorIsTightSpell) return 'tightSpell';
  if (hooks.isUpset) return 'upsetWin';
  return null;
}

/**
 * Pick a quote object from the scenario bucket. Returns null if scenario unknown
 * or the bucket is empty.
 */
export function pickQuote(scenario) {
  if (!scenario) return null;
  const bucket = QUOTES[scenario];
  if (!Array.isArray(bucket) || bucket.length === 0) return null;
  return bucket[Math.floor(Math.random() * bucket.length)];
}

export default QUOTES;
