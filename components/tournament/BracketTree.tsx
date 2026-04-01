import React, { useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet,
} from "react-native";
import {
  BracketRound, BracketMatch,
  CARD_HEIGHT, CARD_WIDTH, ROUND_GAP, MATCH_V_GAP,
} from "@/lib/bracketUtils";
import BracketMatchCard from "./BracketMatchCard";

interface Props {
  rounds: BracketRound[];
  onPopOut: (match: BracketMatch) => void;
}

/**
 * Pure visual bracket tree.
 * Layout: each round is a column; cards are vertically centred within their
 * "slot" — a slot being the vertical space that two child matches occupy.
 *
 * For round R with M matches:
 *   - Round 1 slot height = CARD_HEIGHT + MATCH_V_GAP
 *   - Round R slot height = 2 × slot height of R-1
 *
 * SVG connector lines drawn between adjacent rounds using absolute positioning.
 */
export default function BracketTree({ rounds, onPopOut }: Props) {
  if (rounds.length === 0) return null;

  // Slot height per round (doubles each round)
  const r1SlotH = CARD_HEIGHT + MATCH_V_GAP;

  const slotHeightForRound = (r: number) =>
    r1SlotH * Math.pow(2, r - 1);

  // Total height = slot height of last round (contains 1 match)
  const lastRound = rounds[rounds.length - 1];
  const totalH = slotHeightForRound(lastRound.round);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.scroll, { height: totalH + 80 }]}
    >
      {rounds.map((round, rIdx) => {
        const slotH   = slotHeightForRound(round.round);
        const colLeft = rIdx * (CARD_WIDTH + ROUND_GAP);

        return (
          <View key={round.round} style={[styles.roundCol, { left: colLeft, height: totalH }]}>
            {/* Round label */}
            <Text style={styles.roundLabel}>{round.label}</Text>

            {/* Matches */}
            {round.matches.map((match, mIdx) => {
              // Centre this card within its slot
              const slotTop  = mIdx * slotH;
              const cardTop  = slotTop + (slotH - CARD_HEIGHT) / 2;

              // Connector lines to next round
              // This card feeds into parent match at index floor(mIdx/2) in the next round
              const parentSlotH = slotH * 2;
              const parentMIdx  = Math.floor(mIdx / 2);

              // Right-side connector origin (centre-right of this card)
              const myLineY = cardTop + CARD_HEIGHT / 2;
              // Target: parent card centre in next round
              const parentCardTop = parentMIdx * parentSlotH + (parentSlotH - CARD_HEIGHT) / 2;
              const parentLineY   = parentCardTop + CARD_HEIGHT / 2;

              const isLastRound = rIdx === rounds.length - 1;

              return (
                <View key={match.id}>
                  {/* Match card */}
                  <View style={[styles.cardWrap, { top: cardTop }]}>
                    <BracketMatchCard match={match} onPopOut={onPopOut} />
                  </View>

                  {/* Horizontal line from card right edge */}
                  {!isLastRound && (
                    <View
                      style={[
                        styles.hLine,
                        {
                          top:  myLineY,
                          left: CARD_WIDTH,
                          width: ROUND_GAP / 2,
                        },
                      ]}
                    />
                  )}

                  {/* Vertical joining line (only for the first of each pair) */}
                  {!isLastRound && mIdx % 2 === 0 && (
                    <View
                      style={[
                        styles.vLine,
                        {
                          left:   CARD_WIDTH + ROUND_GAP / 2,
                          top:    Math.min(myLineY, parentLineY + (slotH - CARD_HEIGHT) / 2),
                          height: Math.abs(myLineY - (myLineY + slotH)),
                        },
                      ]}
                    />
                  )}

                  {/* Horizontal line from join point to next card */}
                  {!isLastRound && mIdx % 2 === 1 && (
                    <View
                      style={[
                        styles.hLine,
                        {
                          top:  parentLineY,
                          left: CARD_WIDTH + ROUND_GAP / 2,
                          width: ROUND_GAP / 2,
                        },
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    position: "relative",
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  roundCol: {
    position: "absolute",
    width: CARD_WIDTH,
    top: 40,     // leave room for round label above
  },
  roundLabel: {
    position: "absolute",
    top: -32,
    left: 0,
    width: CARD_WIDTH,
    textAlign: "center",
    color: "#2D3748",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  cardWrap: {
    position: "absolute",
    width: CARD_WIDTH,
  },
  hLine: {
    position: "absolute",
    height: 1,
    backgroundColor: "#1A1A3A",
  },
  vLine: {
    position: "absolute",
    width: 1,
    backgroundColor: "#1A1A3A",
  },
});