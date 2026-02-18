import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';

export default function FollowDriverButton({ driverId }) {
  const queryClient = useQueryClient();

  const { data: isAuthenticated } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: () => base44.auth.isAuthenticated(),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: !!isAuthenticated,
  });

  const { data: follows = [] } = useQuery({
    queryKey: ['followDriver', driverId, user?.id],
    queryFn: () => base44.entities.UserFollowDriver.filter({ driver_id: driverId, user_id: user.id }),
    enabled: !!user?.id && !!driverId,
  });

  const isFollowing = follows.length > 0;

  const followMutation = useMutation({
    mutationFn: () => base44.entities.UserFollowDriver.create({ driver_id: driverId, user_id: user.id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['followDriver', driverId, user?.id] }),
  });

  const unfollowMutation = useMutation({
    mutationFn: () => base44.entities.UserFollowDriver.delete(follows[0].id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['followDriver', driverId, user?.id] }),
  });

  const handleClick = () => {
    if (!isAuthenticated) {
      base44.auth.redirectToLogin();
      return;
    }
    if (isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  const isPending = followMutation.isPending || unfollowMutation.isPending;

  return (
    <Button
      variant={isFollowing ? 'default' : 'outline'}
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      className={isFollowing ? 'bg-[#232323] text-white' : ''}
    >
      <Heart className={`w-4 h-4 mr-2 ${isFollowing ? 'fill-white' : ''}`} />
      {isFollowing ? 'Following' : 'Follow'}
    </Button>
  );
}