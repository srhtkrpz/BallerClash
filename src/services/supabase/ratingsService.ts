import {supabase, getSession} from './client';
import type {MatchRating} from '../../types/models';

function rowToMatchRating(row: any): MatchRating {
  return {
    id: row.id,
    matchId: row.match_id,
    ratedUserId: row.rated_user_id,
    ratedByUserId: row.rated_by,
    score: row.score,
    createdAt: row.created_at,
  };
}

export async function submitRatings(
  matchId: string,
  ratings: {userId: string; score: number}[],
): Promise<void> {
  const session = await getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const rows = ratings.map(r => ({
    match_id: matchId,
    rated_user_id: r.userId,
    rated_by: session.user.id,
    score: r.score,
  }));

  const {error} = await supabase.from('ratings').insert(rows);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getMatchRatings(matchId: string): Promise<MatchRating[]> {
  const {data, error} = await supabase
    .from('ratings')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', {ascending: true});

  if (error || !data) {
    return [];
  }

  return data.map(rowToMatchRating);
}
