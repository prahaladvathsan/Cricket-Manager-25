/**
 * @file blocks/postMatchQuotes.js
 * @description Synthetic post-match quotes. Generates 1-2 pull-quote paragraphs
 * — usually the winning captain plus the Player of the Match — leaning on the
 * familiar tropes of T20 press conferences ("credit to the boys", "knew the
 * wicket would change", "just trying to play the situation").
 *
 * Paragraphs are emitted with a leading `> ` marker so the NewsArticleModal
 * body renderer can style them as italic pull-quotes (the same marker is
 * stripped for the carousel-card lede preview).
 *
 * @module core/news/renderers/matchReport/blocks/postMatchQuotes
 */

import useTeamStore from '../../../../../stores/teamStore.js';
import usePlayerStore from '../../../../../stores/playerStore.js';
import { playerLink, teamLink } from '../../../entityHelpers.js';

const WINNING_CAPTAIN_LINES = [
  'Credit to the boys — every single contribution mattered tonight. That\'s how we want to play our cricket.',
  'We trusted the plan. The bowlers set it up, the batters finished it — no complaints from the dressing room.',
  'Proud of the lads. We knew it was a tough wicket and they read it brilliantly.',
  'The boys showed character. That\'s what wins you these kind of games.',
  'We talked about playing brave cricket and they did exactly that. Onto the next one.'
];

const LOSING_CAPTAIN_LINES = [
  'Couldn\'t quite string together the partnerships we needed. We\'ll review honestly and come back stronger.',
  'Credit to them, they bowled well in the powerplay. We were always playing catch-up after that.',
  'The wicket changed a bit under lights but I won\'t use that as an excuse — we were below our standards.',
  'We\'ve got the squad to bounce back. Important not to drop our heads after one night.',
  'Tough one. There were periods we should have closed out and didn\'t — that\'s the lesson.'
];

const POTM_BATTING_LINES = [
  'Honestly, I just wanted to back the team\'s plan. The boundaries came because the openers gave me a platform.',
  'Felt good in the middle but the result is what counts. Happy we got over the line.',
  'I was clear about what I wanted to do — pick the bowlers I could attack and rotate the rest.',
  'Credit to the bowlers who set it up. My job was easier because of the platform they built.',
  'Just trying to play the situation. The dressing room\'s been telling me to express myself — tonight it came off.'
];

const POTM_BOWLING_LINES = [
  'It was about hitting my lengths and trusting the field. The wickets came because we built pressure together.',
  'Felt the ball coming out well. Important to stick to the basics on a night like this.',
  'My role is to bowl in the powerplay and at the death — happy I could contribute in both.',
  'Credit to the keeper and the slip cordon, they took everything. Bowlers can\'t do it alone.',
  'I\'ve been working on the slower ball in the nets. Nice to see it pay off in a match.'
];

function captainOf(teamId) {
  try {
    const ts = useTeamStore.getState();
    return ts.teamTactics?.[teamId]?.captain || ts.teams?.[teamId]?.captainId || null;
  } catch {
    return null;
  }
}

function playerName(playerId) {
  try {
    return usePlayerStore.getState().players?.[playerId]?.name || null;
  } catch {
    return null;
  }
}

function pickFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function postMatchQuotes(event, assemblerState) {
  const p = event?.payload || {};
  if (!p.winner || !p.loser) return null;

  const paragraphs = [];

  // 1. Winning captain — always emit if we can resolve the name.
  const winningCaptainId = captainOf(p.winner.id);
  const winningCaptainName = playerName(winningCaptainId);
  if (winningCaptainName) {
    const link = playerLink(winningCaptainId, winningCaptainName);
    const teamRef = teamLink(p.winner.id, p.winner.name);
    paragraphs.push(`> "${pickFrom(WINNING_CAPTAIN_LINES)}" — ${link}, ${teamRef} captain.`);
  }

  // 2. POTM — only if we have a real POTM and (defensively) avoid duplicating
  // the winning captain (no point quoting the same player twice).
  const potm = p.playerOfMatch;
  if (potm && potm.name && potm.name !== 'Unknown' && potm.id !== winningCaptainId) {
    // Pick line by whether the POTM was batting- or bowling-anchored
    const anchorType = assemblerState?.anchor?.type;
    const flagKind = assemblerState?.flagKind;
    const isBowling = anchorType === 'bowling' || flagKind === 'unsungHero' || flagKind === 'deathOversSpecialist';
    const line = pickFrom(isBowling ? POTM_BOWLING_LINES : POTM_BATTING_LINES);
    const link = playerLink(potm.id, potm.name);
    paragraphs.push(`> "${line}" — ${link}, Player of the Match.`);
  }

  // 3. On close finishes / playoff losses, get a word from the losing captain.
  if ((p.isCloseFinish || p.isPlayoff) && Math.random() < 0.6) {
    const losingCaptainId = captainOf(p.loser.id);
    const losingCaptainName = playerName(losingCaptainId);
    if (losingCaptainName) {
      const link = playerLink(losingCaptainId, losingCaptainName);
      const teamRef = teamLink(p.loser.id, p.loser.name);
      paragraphs.push(`> "${pickFrom(LOSING_CAPTAIN_LINES)}" — ${link}, ${teamRef} captain.`);
    }
  }

  if (paragraphs.length === 0) return null;
  return { paragraphs };
}

export default postMatchQuotes;
