// BLUEWRITE — Header Component
// Reusable top bar with mobile menu toggle, page title, and user info.

import React from 'react';
import { Menu, Search, Printer, User, ShieldCheck } from 'lucide-react';

function Header({ title, section, user, onMenuClick, onSearch, onPrint }) {
  const currentRole = user?.role;
  const officer = user?.officer;
  const displayName = officer ? `${officer.firstName} ${officer.lastName}` : user?.username || 'Administrator';

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 hover:text-navy-900 lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div>
          <p className="hidden text-xs font-semibold uppercase tracking-wider text-slate-500 sm:block">BLUEWRITE / {section || 'Workspace'}</p>
          <h1 className="text-lg font-bold tracking-tight text-slate-950 sm:text-xl">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onSearch && (
          <button
            type="button"
            onClick={onSearch}
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 hover:text-navy-900"
            aria-label="Search"
          >
            <Search size={20} />
          </button>
        )}
        {onPrint && (
          <button
            type="button"
            onClick={onPrint}
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 hover:text-navy-900"
            aria-label="Print"
          >
            <Printer size={20} />
          </button>
        )}

        <div className="ml-2 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-police-blue-100 text-police-blue-700 ring-1 ring-police-blue-200">
            {currentRole === 'admin' ? <ShieldCheck size={18} /> : <User size={18} />}
          </div>
          <div className="hidden text-sm sm:block">
            <p className="font-semibold text-slate-950">
              {displayName}
            </p>
            <p className="text-xs font-semibold text-slate-600">{currentRole === 'admin' ? 'Administrator' : `Officer · ${officer?.badgeNumber || ''}`}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;