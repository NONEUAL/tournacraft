/**
 * Bracket utility functions — pure, no Supabase dependencies.
 * Works with the Match type from lib/types.ts
 */

import { Match, Team } from "./types";

export interface BracketMatch extends Match {
  team_a: Team | null;
  team_b: Team | null;
  winner: Team | null;
  round: number;
  position: number; // position within the round (1-indexed)
}

export interface BracketRound {
  round: number;
  label: string;
  matches: BracketMatch[];
}

/**
 * Given N teams, compute how many rounds are needed.
 */
export function totalRounds(teamCount: number): number {
  return Math.ceil(Math.log2(teamCount));
}

/**
 * Given total rounds R, compute match_number ranges per round.
 * Round 1: 1 .. 2^(R-1)
 * Round 2: 2^(R-1)+1 .. 2^(R-1)+2^(R-2)
 * etc.
 */
export function matchNumberToRound(matchNumber: number, totalMatchCount: number): number {
  // totalMatchCount = 2^R - 1 for a perfect bracket
  // Match numbers are 1-indexed
  // Round r contains 2^(R-r) matches
  // We figure out R from totalMatchCount: R = log2(totalMatchCount + 1)
  const R = Math.round(Math.log2(totalMatchCount + 1));
  let start = 1;
  for (let r = 1; r <= R; r++) {
    const count = Math.pow(2, R - r);
    if (matchNumber >= start && matchNumber < start + count) return r;
    start += count;
  }
  return R;
}

/**
 * Group raw matches (with teams joined) into rounds for display.
 * Assumes match_number is set and follows the standard encoding.
 */
export function groupMatchesIntoRounds(
  matches: BracketMatch[]
): BracketRound[] {
  if (matches.length === 0) return [];

  const totalMatches = matches.length;
  const R = Math.round(Math.log2(totalMatches + 1));

  const roundMap: Record<number, BracketMatch[]> = {};

  for (const m of matches) {
    const mn = m.match_number ?? 0;
    const round = matchNumberToRound(mn, totalMatches);
    if (!roundMap[round]) roundMap[round] = [];
    roundMap[round].push({ ...m, round, position: roundMap[round].length + 1 });
  }

  const ROUND_LABELS: Record<number, string> = {
    [R]:     "Final",
    [R - 1]: "Semi-Finals",
    [R - 2]: "Quarter-Finals",
  };

  return Object.entries(roundMap)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([r, ms]) => ({
      round:   Number(r),
      label:   ROUND_LABELS[Number(r)] ?? `Round ${r}`,
      matches: ms.sort((a, b) => (a.match_number ?? 0) - (b.match_number ?? 0)),
    }));
}

/**
 * Card dimensions for layout calculations.
 */
export const CARD_HEIGHT   = 88;
export const CARD_WIDTH    = 220;
export const ROUND_GAP     = 60;   // horizontal gap between rounds
export const MATCH_V_GAP   = 16;   // min vertical gap between cards in same round