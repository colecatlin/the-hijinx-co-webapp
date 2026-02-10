import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { toast } from 'sonner';

export default function RateTrackModule({ track }) {
  const [ratingValue, setRatingValue] = useState(null);
  const queryClient = useQueryClient();

  const { data: isAuthenticated } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: () => base44.auth.isAuthenticated(),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: isAuthenticated,
  });

  const { data: existingRating } = useQuery({
    queryKey: ['userTrackRating', track.id, user?.id],
    queryFn: async () => {
      const ratings = await base44.entities.TrackRating.filter({
        track_id: track.id,
        user_id: user.id,
      });
      return ratings[0];
    },
    enabled: !!user?.id && !!track?.id,
  });

  const submitRatingMutation = useMutation({
    mutationFn: async (value) => {
      return await base44.functions.invoke('submitTrackRating', {
        track_id: track.id,
        rating_value: value,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      queryClient.invalidateQueries({ queryKey: ['userTrackRating', track.id, user?.id] });
      toast.success('Rating submitted!');
    },
    onError: (error) => {
      toast.error('Failed to submit rating');
    },
  });

  const handleSubmit = () => {
    if (ratingValue && ratingValue >= 1 && ratingValue <= 10) {
      submitRatingMutation.mutate(ratingValue);
    }
  };

  return (
    <div className="bg-white border border-gray-200 p-6">
      <h3 className="text-sm font-bold text-[#232323] mb-4 flex items-center gap-2">
        <Star className="w-4 h-4" />
        Rate this Track
      </h3>

      <div className="mb-4">
        <div className="text-2xl font-bold text-[#232323]">
          {track.rating_average > 0 ? track.rating_average.toFixed(1) : 'N/A'}
        </div>
        <div className="text-xs text-gray-600">
          {track.rating_count || 0} {track.rating_count === 1 ? 'rating' : 'ratings'}
        </div>
      </div>

      {!isAuthenticated && (
        <div className="text-sm text-gray-600">
          <button
            onClick={() => base44.auth.redirectToLogin()}
            className="text-[#00FFDA] hover:underline"
          >
            Login
          </button>{' '}
          to rate this track
        </div>
      )}

      {isAuthenticated && (
        <div>
          {existingRating && (
            <div className="text-xs text-gray-600 mb-2">
              Your rating: {existingRating.rating_value}/10
            </div>
          )}

          <div className="flex items-center gap-2 mb-3">
            <input
              type="number"
              min="1"
              max="10"
              value={ratingValue || existingRating?.rating_value || ''}
              onChange={(e) => setRatingValue(Number(e.target.value))}
              placeholder="1-10"
              className="w-20 px-3 py-2 border border-gray-300 rounded text-sm"
            />
            <span className="text-sm text-gray-600">/ 10</span>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!ratingValue || ratingValue < 1 || ratingValue > 10 || submitRatingMutation.isPending}
            className="w-full bg-[#232323] hover:bg-[#1A3249] text-white"
            size="sm"
          >
            {submitRatingMutation.isPending ? 'Submitting...' : existingRating ? 'Update Rating' : 'Submit Rating'}
          </Button>
        </div>
      )}
    </div>
  );
}