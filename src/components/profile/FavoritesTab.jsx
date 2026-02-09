import React from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

export default function FavoritesTab({
  formData,
  drivers,
  teams,
  series,
  tracks,
  toggleFavorite,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-50 p-6 rounded-lg space-y-6"
    >
      <h2 className="text-xl font-bold text-[#232323] flex items-center gap-2">
        <Heart className="w-5 h-5" />
        Your Favorites
      </h2>

      {/* Favorite Drivers */}
      <div>
        <Label className="text-base mb-3 block">Favorite Drivers</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {drivers.map((driver) => (
            <div key={driver.id} className="flex items-center gap-2">
              <Checkbox
                checked={formData.favorite_drivers.includes(driver.id)}
                onCheckedChange={() => toggleFavorite('drivers', driver.id)}
              />
              <label className="text-sm text-[#232323] cursor-pointer">
                {driver.name} {driver.number ? `#${driver.number}` : ''}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Favorite Teams */}
      <div>
        <Label className="text-base mb-3 block">Favorite Teams</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {teams.map((team) => (
            <div key={team.id} className="flex items-center gap-2">
              <Checkbox
                checked={formData.favorite_teams.includes(team.id)}
                onCheckedChange={() => toggleFavorite('teams', team.id)}
              />
              <label className="text-sm text-[#232323] cursor-pointer">
                {team.name}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Favorite Series */}
      <div>
        <Label className="text-base mb-3 block">Favorite Series</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {series.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <Checkbox
                checked={formData.favorite_series.includes(s.id)}
                onCheckedChange={() => toggleFavorite('series', s.id)}
              />
              <label className="text-sm text-[#232323] cursor-pointer">
                {s.name}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Favorite Tracks */}
      <div>
        <Label className="text-base mb-3 block">Favorite Tracks</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tracks.map((track) => (
            <div key={track.id} className="flex items-center gap-2">
              <Checkbox
                checked={formData.favorite_tracks.includes(track.id)}
                onCheckedChange={() => toggleFavorite('tracks', track.id)}
              />
              <label className="text-sm text-[#232323] cursor-pointer">
                {track.name}
              </label>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}