import {supabase, getSession} from './client';
import type {Profile, AvatarConfig, City, PlayerPosition} from '../../types/models';

function rowToProfile(row: any): Profile {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name ?? '',
    instagramHandle: row.instagram_handle ?? undefined,
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
    position: row.position as PlayerPosition,
    avgRating: row.avg_rating ?? 0,
    totalMatches: row.total_matches ?? 0,
    wins: row.wins ?? 0,
    losses: row.losses ?? 0,
    winStreak: row.win_streak ?? 0,
    teamId: row.team_id ?? undefined,
    createdAt: row.created_at,
  };
}

export async function getMyProfile(): Promise<Profile | null> {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const {data, error} = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return rowToProfile(data);
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const {data, error} = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return rowToProfile(data);
}

export async function createProfile(data: {
  username: string;
  city: City;
  position: PlayerPosition;
  instagramHandle?: string;
}): Promise<Profile> {
  const session = await getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const {data: row, error} = await supabase
    .from('profiles')
    .insert({
      id: session.user.id,
      username: data.username,
      city: data.city,
      position: data.position,
      instagram_handle: data.instagramHandle ?? null,
      full_name: '',
      avg_rating: 0,
      total_matches: 0,
      wins: 0,
      losses: 0,
      win_streak: 0,
    })
    .select()
    .single();

  if (error || !row) {
    throw new Error(error?.message ?? 'Failed to create profile');
  }

  return rowToProfile(row);
}

export async function updateProfile(
  updates: Partial<{
    username: string;
    city: City;
    position: PlayerPosition;
    instagramHandle: string;
    avatarConfig: AvatarConfig;
  }>,
): Promise<Profile | null> {
  const session = await getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const payload: Record<string, unknown> = {};
  if (updates.username !== undefined) {
    payload.username = updates.username;
  }
  if (updates.city !== undefined) {
    payload.city = updates.city;
  }
  if (updates.position !== undefined) {
    payload.position = updates.position;
  }
  if (updates.instagramHandle !== undefined) {
    payload.instagram_handle = updates.instagramHandle;
  }
  if (updates.avatarConfig !== undefined) {
    payload.avatar_config = updates.avatarConfig;
  }

  const {data, error} = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', session.user.id)
    .select()
    .single();

  if (error || !data) {
    return null;
  }

  return rowToProfile(data);
}
