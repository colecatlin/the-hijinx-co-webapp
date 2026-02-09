import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Coffee, Beer, Wine, Utensils, Sandwich, Soup, Pizza, Apple, Zap, Cpu, Wifi, Monitor, Smartphone, Code, Database, Server, Heart, Star, Award, Flame, Shield, Truck, Music, Video, Camera, Headphones, Gamepad2, Microscope, Beaker, Wrench, Settings, AlertCircle, CheckCircle, Info, Target, Lightbulb } from 'lucide-react';

const ICON_MAP = {
  'Coffee': Coffee,
  'Beer': Beer,
  'Wine': Wine,
  'Utensils': Utensils,
  'Sandwich': Sandwich,
  'Soup': Soup,
  'Pizza': Pizza,
  'Apple': Apple,
  'Zap': Zap,
  'Cpu': Cpu,
  'Wifi': Wifi,
  'Monitor': Monitor,
  'Smartphone': Smartphone,
  'Code': Code,
  'Database': Database,
  'Server': Server,
  'Heart': Heart,
  'Star': Star,
  'Award': Award,
  'Flame': Flame,
  'Shield': Shield,
  'Truck': Truck,
  'Music': Music,
  'Video': Video,
  'Camera': Camera,
  'Headphones': Headphones,
  'Gamepad2': Gamepad2,
  'Microscope': Microscope,
  'Beaker': Beaker,
  'Wrench': Wrench,
  'Settings': Settings,
  'AlertCircle': AlertCircle,
  'CheckCircle': CheckCircle,
  'Info': Info,
  'Target': Target,
  'Lightbulb': Lightbulb,
};

export default function IconSelector({ value, onChange }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const iconNames = Object.keys(ICON_MAP);
  const filteredIcons = iconNames.filter(icon =>
    icon.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const SelectedIconComponent = value && ICON_MAP[value] ? ICON_MAP[value] : null;

  return (
    <div className="relative">
      <label className="block text-sm font-medium mb-2">Icon</label>
      
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md flex items-center gap-2 hover:bg-gray-50"
      >
        {SelectedIconComponent ? (
          <>
            <SelectedIconComponent className="w-4 h-4" />
            <span className="text-sm">{value}</span>
          </>
        ) : (
          <span className="text-sm text-gray-500">Select an icon...</span>
        )}
      </button>

      {showPicker && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-4 w-96">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Select Icon</h3>
            <button
              type="button"
              onClick={() => setShowPicker(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <Input
            placeholder="Search icons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-3"
          />

          <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto">
            {filteredIcons.map((iconName) => {
              const IconComponent = ICON_MAP[iconName];
              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => {
                    onChange(iconName);
                    setShowPicker(false);
                    setSearchTerm('');
                  }}
                  className={`p-2 rounded-md flex items-center justify-center transition-colors ${
                    value === iconName
                      ? 'bg-[#1DA1A1] text-white'
                      : 'hover:bg-gray-100'
                  }`}
                  title={iconName}
                >
                  <IconComponent className="w-5 h-5" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}