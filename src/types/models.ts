// ── Auth ──────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  username: string;
  fullName: string;
  instagramHandle?: string;
  avatarConfig: AvatarConfig;
  city: City;
  position: PlayerPosition;
  avgRating: number;
  totalMatches: number;
  wins: number;
  losses: number;
  winStreak: number;
  teamId?: string;
  createdAt: string;
}

// ── Avatar ────────────────────────────────────────────────────────────────────

export type HairStyle = 'short' | 'fade' | 'curly' | 'afro' | 'buzz';

export interface AvatarConfig {
  skin: string;
  hair: string;
  hairColor: string;
  hairStyle?: HairStyle;
  eyeColor?: string;
  jersey: string;
  jerseyColor: string;
  jerseyNumber?: number;
  shorts: string;
  shoes: string;
  accessory?: string;
}

// ── Team ──────────────────────────────────────────────────────────────────────

export interface Team {
  id: string;
  name: string;
  captainId: string;
  city: City;
  logoColor: string;
  members: TeamMember[];
  avgRating: number;
  totalMatches: number;
  wins: number;
  losses: number;
  winStreak: number;
  createdAt: string;
}

export interface TeamMember {
  userId: string;
  username: string;
  avatarConfig: AvatarConfig;
  avgRating: number;
  role: 'captain' | 'player';
  joinedAt: string;
}

// ── Match ─────────────────────────────────────────────────────────────────────

export interface Match {
  id: string;
  challengerTeamId: string;
  challengerTeamName: string;
  opponentTeamId?: string;
  opponentTeamName?: string;
  courtId: string;
  courtName: string;
  city: City;
  scheduledAt: string;
  status: MatchStatus;
  scoreChallenger?: number;
  scoreOpponent?: number;
  winnerTeamId?: string;
  ratings?: MatchRating[];
  // start voting
  startVoteChallenger: boolean;
  startVoteOpponent: boolean;
  matchStartedAt?: string;
  createdAt: string;
}

export interface MatchResultVote {
  matchId: string;
  teamRole: 'challenger' | 'opponent';
  scoreChallenger: number;
  scoreOpponent: number;
  winnerTeamId?: string;
  submittedAt: string;
}

export type MatchStatus = 'open' | 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export interface MatchPlayer {
  id: string;
  matchId: string;
  userId: string;
  teamId: string;
  username: string;
  checkedIn: boolean;
  checkedInAt?: string;
}

export interface MatchRating {
  id: string;
  matchId: string;
  ratedUserId: string;
  ratedByUserId: string;
  score: number; // 1–10
  createdAt: string;
}

// ── Court ─────────────────────────────────────────────────────────────────────

export interface Court {
  id: string;
  name: string;
  address: string;
  city: City;
  latitude: number;
  longitude: number;
  isIndoor: boolean;
  activePlayers?: number;
  rating?: number;
  createdAt: string;
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarConfig: AvatarConfig;
  city: City;
  avgRating: number;
  totalMatches: number;
  wins: number;
  winStreak: number;
  badge?: LeaderboardBadge;
}

export type LeaderboardBadge = 'city_champ' | 'hot_streak' | 'veteran' | 'rising';

// ── Enums ─────────────────────────────────────────────────────────────────────

export type City = 'istanbul' | 'ankara' | 'izmir';
export type PlayerPosition = 'PG' | 'SG' | 'SF' | 'PF' | 'C';
