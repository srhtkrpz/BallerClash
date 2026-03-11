import {supabase, getSession, getCurrentUser} from './client';
import type {Match, City, MatchStatus, MatchPlayer} from '../../types/models';

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
    .in('status', ['open', 'pending', 'confirmed', 'in_progress'])
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

  // 1. Set status confirmed
  const {error} = await supabase
    .from('matches')
    .update({status: 'confirmed'})
    .eq('id', matchId);

  if (error) {
    throw new Error(error.message);
  }

  // 2. Fetch match to get both team IDs
  const match = await getMatchById(matchId);
  if (!match) {
    return;
  }

  // 3. Fetch members of both teams
  const teamIds = [match.challengerTeamId, match.opponentTeamId].filter(Boolean) as string[];
  const {data: members} = await supabase
    .from('team_members')
    .select('user_id, team_id')
    .in('team_id', teamIds);

  if (members && members.length > 0) {
    // Insert, ignore conflicts (players already added)
    await supabase.from('match_players').upsert(
      members.map((m: any) => ({
        match_id: matchId,
        user_id: m.user_id,
        team_id: m.team_id,
        checked_in: false,
      })),
      {onConflict: 'match_id,user_id', ignoreDuplicates: true},
    );
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

export async function getMatchPlayers(matchId: string): Promise<MatchPlayer[]> {
  const {data, error} = await supabase
    .from('match_players')
    .select('*, profiles(username)')
    .eq('match_id', matchId);
  if (error || !data) {
    return [];
  }
  return data.map((row: any) => ({
    id: row.id,
    matchId: row.match_id,
    userId: row.user_id,
    teamId: row.team_id,
    username: row.profiles?.username ?? 'Oyuncu',
    checkedIn: row.checked_in,
    checkedInAt: row.checked_in_at ?? undefined,
  }));
}

// Haversine distance in meters
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function checkInToMatch(
  matchId: string,
  courtLatitude: number,
  courtLongitude: number,
): Promise<{success: boolean; distanceMeters: number}> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get current location
  const loc = await import('expo-location');
  const {status} = await loc.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Konum izni gerekli.');
  }

  const position = await loc.getCurrentPositionAsync({
    accuracy: loc.LocationAccuracy.High,
  });
  const distance = haversineDistance(
    position.coords.latitude,
    position.coords.longitude,
    courtLatitude,
    courtLongitude,
  );

  const CHECK_IN_RADIUS = 300; // meters
  if (distance > CHECK_IN_RADIUS) {
    return {success: false, distanceMeters: Math.round(distance)};
  }

  const {error} = await supabase
    .from('match_players')
    .update({checked_in: true, checked_in_at: new Date().toISOString()})
    .eq('match_id', matchId)
    .eq('user_id', user.id);
  if (error) {
    throw error;
  }

  return {success: true, distanceMeters: Math.round(distance)};
}

export async function startMatch(matchId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }
  const {error} = await supabase
    .from('matches')
    .update({status: 'in_progress'})
    .eq('id', matchId);
  if (error) {
    throw error;
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
