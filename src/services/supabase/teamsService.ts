import {supabase, getSession} from './client';
import type {Team, TeamMember, City, AvatarConfig} from '../../types/models';

function rowToTeam(row: any, members: TeamMember[] = []): Team {
  return {
    id: row.id,
    name: row.name,
    captainId: row.captain_id,
    city: row.city as City,
    logoColor: row.logo_color ?? '#f97316',
    members,
    avgRating: row.avg_rating ?? 0,
    totalMatches: row.total_matches ?? 0,
    wins: row.wins ?? 0,
    losses: row.losses ?? 0,
    winStreak: row.win_streak ?? 0,
    createdAt: row.created_at,
  };
}

function rowToTeamMember(row: any): TeamMember {
  const profile = row.profiles ?? {};
  return {
    userId: row.user_id,
    username: profile.username ?? '',
    avatarConfig: (profile.avatar_config as AvatarConfig) ?? {
      skin: 'medium',
      hair: 'short',
      hairColor: '#1a1a1a',
      jersey: 'default',
      jerseyColor: '#f97316',
      shorts: 'default',
      shoes: 'default',
    },
    avgRating: profile.avg_rating ?? 0,
    role: row.role as 'captain' | 'player',
    joinedAt: row.joined_at,
  };
}

export async function getMyTeam(): Promise<Team | null> {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const {data: profileRow, error: profileError} = await supabase
    .from('profiles')
    .select('team_id')
    .eq('id', session.user.id)
    .maybeSingle();

  if (profileError || !profileRow?.team_id) {
    return null;
  }

  return getTeamById(profileRow.team_id);
}

export async function getTeamById(id: string): Promise<Team | null> {
  const {data: teamRow, error: teamError} = await supabase
    .from('teams')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (teamError || !teamRow) {
    return null;
  }

  const members = await getTeamMembers(id);
  return rowToTeam(teamRow, members);
}

export async function createTeam(
  name: string,
  city: City,
  logoColor: string,
): Promise<Team> {
  const session = await getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const {data: teamRow, error: teamError} = await supabase
    .from('teams')
    .insert({
      name,
      city,
      logo_color: logoColor,
      captain_id: session.user.id,
      avg_rating: 0,
      total_matches: 0,
      wins: 0,
      losses: 0,
      win_streak: 0,
    })
    .select()
    .single();

  if (teamError || !teamRow) {
    throw new Error(teamError?.message ?? 'Failed to create team');
  }

  const {error: memberError} = await supabase.from('team_members').insert({
    team_id: teamRow.id,
    user_id: session.user.id,
    role: 'captain',
  });

  if (memberError) {
    throw new Error(memberError.message);
  }

  const {error: profileError} = await supabase
    .from('profiles')
    .update({team_id: teamRow.id})
    .eq('id', session.user.id);

  if (profileError) {
    throw new Error(profileError.message);
  }

  return rowToTeam(teamRow, []);
}

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  const {data, error} = await supabase
    .from('team_members')
    .select('*, profiles(username, avatar_config, avg_rating)')
    .eq('team_id', teamId)
    .order('joined_at', {ascending: true});

  if (error || !data) {
    return [];
  }

  return data.map(rowToTeamMember);
}

export async function inviteMember(
  teamId: string,
  userId: string,
): Promise<void> {
  const session = await getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const {error: memberError} = await supabase.from('team_members').insert({
    team_id: teamId,
    user_id: userId,
    role: 'player',
  });

  if (memberError) {
    throw new Error(memberError.message);
  }

  const {error: profileError} = await supabase
    .from('profiles')
    .update({team_id: teamId})
    .eq('id', userId);

  if (profileError) {
    throw new Error(profileError.message);
  }
}

export async function leaveTeam(teamId: string): Promise<void> {
  const session = await getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const {error: deleteError} = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', session.user.id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  const {error: profileError} = await supabase
    .from('profiles')
    .update({team_id: null})
    .eq('id', session.user.id);

  if (profileError) {
    throw new Error(profileError.message);
  }
}
