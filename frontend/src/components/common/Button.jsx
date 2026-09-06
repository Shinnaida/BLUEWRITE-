// BLUEWRITE — Button Component
// Reusable button with variants: primary, secondary, danger, ghost, link.

import React from 'react';

const variants = {
  primary: 'bg-blue-700 text-white shadow-sm hover:bg-blue-600',
  secondary: 'border border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-50 hover:text-slate-950',
  danger: 'bg-red-700 text-white shadow-sm hover:bg-red-800',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-950',
  link: 'bg-transparent text-blue-700 hover:text-blue-600 hover:underline p-0',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  className = '',
  onClick,
  ...props
}) {
  const base = 'inline-flex items-center justify-center rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;