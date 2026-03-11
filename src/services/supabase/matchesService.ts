import {supabase, getSession} from './client';
import type {Match, City, MatchStatus} from '../../types/models';

function rowToMatch(row: any): Match {
  return {
    id: row.id,
    challengerTeamId: row.challenger_team_id,
    challengerTeamName: row.challenger_team_name,
    opponentTeamId: row.opponent_team_id ?? undefined,
    opponentTeamName: row.opponent_team_name ?? undefined,
    courtId: row.court_id,
    courtName: row.court_name,
    city: row.city as City,
    scheduledAt: row.scheduled_at,
    status: row.status as MatchStatus,
    scoreChallenger: row.score_challenger ?? undefined,
    scoreOpponent: row.score_opponent ?? undefined,
    winnerTeamId: row.winner_team_id ?? undefined,
    createdAt: row.created_at,
  };
}

export async function getOpenMatches(city?: City): Promise<Match[]> {
  let query = supabase
    .from('matches')
    .select('*')
    .in('status', ['open', 'pending', 'confirmed'])
    .order('scheduled_at', {ascending: true});

  if (city) {
    query = query.eq('city', city);
  }

  const {data, error} = await query;

  if (error || !data) {
    return [];
  }

  return data.map(rowToMatch);
}

export async function getMatchById(id: string): Promise<Match | null> {
  const {data, error} = await supabase
    .from('matches')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return rowToMatch(data);
}

export async function createMatch(data: {
  courtId: string;
  courtName: string;
  city: City;
  scheduledAt: string;
  challengerTeamId: string;
  challengerTeamName: string;
}): Promise<Match> {
  const session = await getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const {data: row, error} = await supabase
    .from('matches')
    .insert({
      court_id: data.courtId,
      court_name: data.courtName,
      city: data.city,
      scheduled_at: data.scheduledAt,
      challenger_team_id: data.challengerTeamId,
      challenger_team_name: data.challengerTeamName,
      status: 'open',
      created_by: session.user.id,
    })
    .select()
    .single();

  if (error || !row) {
    throw new Error(error?.message ?? 'Failed to create match');
  }

  return rowToMatch(row);
}

export async function challengeMatch(
  matchId: string,
  opponentTeamId: string,
  opponentTeamName: string,
): Promise<void> {
  const session = await getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const {error} = await supabase
    .from('matches')
    .update({
      opponent_team_id: opponentTeamId,
      opponent_team_name: opponentTeamName,
      status: 'pending',
    })
    .eq('id', matchId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function confirmMatch(matchId: string): Promise<void> {
  const session = await getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const {error} = await supabase
    .from('matches')
    .update({status: 'confirmed'})
    .eq('id', matchId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function completeMatch(
  matchId: string,
  scoreChallenger: number,
  scoreOpponent: number,
  winnerTeamId: string,
): Promise<void> {
  const session = await getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const {error} = await supabase
    .from('matches')
    .update({
      status: 'completed',
      score_challenger: scoreChallenger,
      score_opponent: scoreOpponent,
      winner_team_id: winnerTeamId,
    })
    .eq('id', matchId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function cancelChallenge(matchId: string): Promise<void> {
  const session = await getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const {error} = await supabase
    .from('matches')
    .update({status: 'open', opponent_team_id: null, opponent_team_name: null})
    .eq('id', matchId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getMyMatches(): Promise<Match[]> {
  const session = await getSession();
  if (!session) {
    return [];
  }

  const {data: profileRow} = await supabase
    .from('profiles')
    .select('team_id')
    .eq('id', session.user.id)
    .maybeSingle();

  if (!profileRow?.team_id) {
    return [];
  }

  const teamId = profileRow.team_id;

  const {data, error} = await supabase
    .from('matches')
    .select('*')
    .or(`challenger_team_id.eq.${teamId},opponent_team_id.eq.${teamId}`)
    .order('scheduled_at', {ascending: false});

  if (error || !data) {
    return [];
  }

  return data.map(rowToMatch);
}
