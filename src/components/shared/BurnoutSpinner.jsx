import React from 'react';

export default function BurnoutSpinner() {
  return (
    <div className="flex items-center justify-center">
      <style>{`
        @keyframes burnout-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes smoke-fade {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        .burnout-wheel {
          animation: burnout-spin 0.6s linear infinite;
        }
        .smoke {
          animation: smoke-fade 1s ease-out forwards;
        }
      `}</style>
      
      <div className="relative w-8 h-8">
        {/* Skid marks/smoke effect */}
        <div className="absolute inset-0 smoke opacity-60">
          <div className="absolute left-0 top-1/2 w-12 h-1 bg-gradient-to-r from-gray-400 to-transparent -translate-x-12"></div>
          <div className="absolute right-0 top-1/2 w-12 h-1 bg-gradient-to-l from-gray-400 to-transparent translate-x-12"></div>
        </div>

        {/* Wheel */}
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full burnout-wheel"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Tire */}
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" />
          <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" />
          
          {/* Rim */}
          <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="3" />
          
          {/* Lug nuts */}
          <circle cx="50" cy="25" r="2.5" fill="currentColor" />
          <circle cx="65.6" cy="34.4" r="2.5" fill="currentColor" />
          <circle cx="75" cy="50" r="2.5" fill="currentColor" />
          <circle cx="65.6" cy="65.6" r="2.5" fill="currentColor" />
          <circle cx="50" cy="75" r="2.5" fill="currentColor" />
          <circle cx="34.4" cy="65.6" r="2.5" fill="currentColor" />
          <circle cx="25" cy="50" r="2.5" fill="currentColor" />
          <circle cx="34.4" cy="34.4" r="2.5" fill="currentColor" />
          
          {/* Center cap */}
          <circle cx="50" cy="50" r="8" fill="currentColor" opacity="0.8" />
        </svg>
      </div>
    </div>
  );
}