/**
 * R9CZ-R1 — useUserDisplayMap
 * Builds a userId → { id, full_name, email, role } lookup map.
 * Fetches all users once and caches. Used wherever raw user_id UUIDs
 * would otherwise be displayed (officials list, incident assignees, etc.)
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useUserDisplayMap() {
  const { data: users = [] } = useQuery({
    queryKey: ['users_display_map'],
    queryFn: () => base44.entities.User.list(),
    staleTime: 5 * 60 * 1000, // 5 minutes — user list rarely changes during an event
  });

  const userMap = useMemo(() => {
    const map = {};
    users.forEach(u => {
      map[u.id] = {
        id: u.id,
        full_name: u.full_name || u.email || 'Unknown User',
        email: u.email || '',
        role: u.role || '',
      };
    });
    return map;
  }, [users]);

  /**
   * Get display object for a user ID.
   * Returns a safe fallback if the user is not in the map.
   */
  const getUser = (userId) => {
    if (!userId) return null;
    return userMap[userId] || {
      id: userId,
      full_name: `User ${userId.slice(0, 8)}…`,
      email: '',
      role: '',
    };
  };

  /**
   * Get just the display name for a user ID.
   */
  const getUserName = (userId) => {
    if (!userId) return '—';
    return userMap[userId]?.full_name || `User ${userId.slice(0, 8)}…`;
  };

  return { userMap, getUser, getUserName, users };
}

export default useUserDisplayMap;