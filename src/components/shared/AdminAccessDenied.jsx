import React from 'react';
import { ShieldOff, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * AdminAccessDenied
 * Presentational-only access denied component.
 * Works in both RaceCore dark shell and Management light shell.
 */
export default function AdminAccessDenied({ description }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-6 py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
        <ShieldOff className="w-6 h-6 text-red-500" />
      </div>
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
        Admin access required
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
        {description || 'This page is restricted to platform administrators. Contact your admin if you need access.'}
      </p>
      <Link
        to="/racecore"
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to RaceCore
      </Link>
    </div>
  );
}