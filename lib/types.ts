export type GameType = "mlbb" | "cod" | "basketball" | "tekken" | "valorant";
export type TournamentStatus = "setup" | "active" | "completed" | "archived";
export type MatchStatus = "pending" | "live" | "completed" | "bye";
export type StageFormat = "group" | "single_elim" | "double_elim" | "round_robin";

export interface Tournament {
  id: string;
  name: string;
  game_type: GameType;
  stat_template: Record<string, unknown>;
  status: TournamentStatus;
  created_by: string;
  created_at: string;
}

export interface Team {
  id: string;
  tournament_id: string;
  name: string;
  seed: number | null;
  created_at: string;
}

export interface Player {
  id: string;
  team_id: string;
  name: string;
  role: string | null;
  jersey_number: string | null;
  created_at: string;
}

export interface Stage {
  id: string;
  tournament_id: string;
  name: string;
  format: StageFormat;
  sequence_order: number;
  created_at: string;
}

export interface Match {
  id: string;
  stage_id: string;
  team_a_id: string | null;
  team_b_id: string | null;
  team_a_score: number;
  team_b_score: number;
  status: MatchStatus;
  winner_id: string | null;
  match_number: number | null;
  scheduled_at: string | null;
  completed_at: string | null;
}

export interface MatchStat {
  id: string;
  match_id: string;
  player_id: string;
  stat_key: string;
  value: number;
  updated_at: string;
}

// Joined types used in UI
export interface MatchWithTeams extends Match {
  team_a: Team | null;
  team_b: Team | null;
  winner: Team | null;
}

export interface PlayerWithStats extends Player {
  stats: Record<string, number>;
}