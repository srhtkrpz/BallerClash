import {supabase} from './client';
import type {LeaderboardEntry, City, AvatarConfig, LeaderboardBadge} from '../../types/models';

function computeBadge(row: any): LeaderboardBadge | undefined {
  if (row.win_streak >= 5) {
    return 'hot_streak';
  }
  if (row.total_matches >= 50) {
    return 'veteran';
  }
  if (row.total_matches <= 5 && row.avg_rating >= 7) {
    return 'rising';
  }
  return undefined;
}

function rowToLeaderboardEntry(row: any, rank: number): LeaderboardEntry {
  return {
    rank,
    userId: row.id,
    username: row.username,
    avatarConfig: (row.avatar_config as AvatarConfig) ?? {
      skin: 'medium',
      hair: 'short',
      hairColor: '#1a1a1a',
      jersey: 'default',
      jerseyColor: '#f97316',
      shorts: 'default',
      shoes: 'default',
    },
    city: row.city as City,
    avgRating: row.avg_rating ?? 0,
    totalMatches: row.total_matches ?? 0,
    wins: row.wins ?? 0,
    winStreak: row.win_streak ?? 0,
    badge: computeBadge(row),
  };
}

export async function getLeaderboard(
  city?: City,
  limit: number = 50,
): Promise<LeaderboardEntry[]> {
  let query = supabase
    .from('profiles')
    .select('id, username, avatar_config, city, avg_rating, total_matches, wins, win_streak')
    .gt('total_matches', 0)
    .order('avg_rating', {ascending: false})
    .limit(limit);

  if (city) {
    query = query.eq('city', city);
  }

  const {data, error} = await query;

  if (error || !data) {
    return [];
  }

  return data.map((row, index) => rowToLeaderboardEntry(row, index + 1));
}
