import React from 'react';
import { Droplets, Wind, Sun, Shield, Zap, Star, Leaf, Ruler, RefreshCw, Lock } from 'lucide-react';

const ICON_MAP = {
  droplets: Droplets,
  wind: Wind,
  sun: Sun,
  shield: Shield,
  zap: Zap,
  star: Star,
  leaf: Leaf,
  ruler: Ruler,
  refresh: RefreshCw,
  lock: Lock,
};

export default function FeatureIconGrid({ features = [] }) {
  if (!features || features.length === 0) return null;

  return (
    <div className="py-12 border-t border-[#1a1a1a]">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {features.map((f, i) => {
          const Icon = ICON_MAP[f.icon] || Shield;
          return (
            <div key={i} className="flex flex-col items-center text-center gap-3">
              <div className="w-10 h-10 border border-[#00FFDA]/30 flex items-center justify-center">
                <Icon className="w-4 h-4 text-[#00FFDA]" />
              </div>
              <span className="text-xs font-mono tracking-[0.15em] text-[#A1A1A1] uppercase leading-tight">
                {f.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}