// BLUEWRITE — LoadingSpinner Component
// Reusable loading indicator.

import React from 'react';

function LoadingSpinner({ size = 'md', label = 'Loading...' }) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-police-blue-600 border-t-transparent`}
        role="status"
        aria-label={label}
      />
      <p className="text-sm text-slate-600">{label}</p>
    </div>
  );
}

export default LoadingSpinner;