import {supabase} from './client';
import type {Court, City} from '../../types/models';

function rowToCourt(row: any): Court {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    city: row.city as City,
    latitude: row.latitude,
    longitude: row.longitude,
    isIndoor: row.is_indoor ?? false,
    activePlayers: row.active_players ?? undefined,
    createdAt: row.created_at,
  };
}

export async function getCourts(city?: City): Promise<Court[]> {
  let query = supabase.from('courts').select('*').order('name', {ascending: true});

  if (city) {
    query = query.eq('city', city);
  }

  const {data, error} = await query;

  if (error || !data) {
    return [];
  }

  return data.map(rowToCourt);
}

export async function getCourtById(id: string): Promise<Court | null> {
  const {data, error} = await supabase
    .from('courts')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return rowToCourt(data);
}
