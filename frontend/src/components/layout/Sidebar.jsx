// BLUEWRITE — Sidebar Component
// Reusable navigation sidebar for admin and officer layouts.
// Responsive: fixed drawer on desktop, slide-over on mobile.

import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { ChevronRight, CircleUser, LogOut, X } from 'lucide-react';
import BrandMark from '../common/BrandMark';
import { ConfirmDialog } from '../common/Modal';
import { PRODUCT_NAME, SIDEBAR_SUBTITLE } from '../../utils/constants';

function Sidebar({ navSections = [], historySection, user, profileTo, onLogout, isOpen = false, onClose, collapsed = false, workspaceLabel }) {
  const isCompact = collapsed && !isOpen;
  const { pathname } = useLocation();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const displayName = user?.officer
    ? `${user.officer.firstName} ${user.officer.lastName}`
    : user?.username || 'Administrator';
  const roleLabel = user?.role === 'admin' ? 'Administrator' : `Officer${user?.officer?.badgeNumber ? ` · ${user.officer.badgeNumber}` : ''}`;
  const resolvedProfileTo = profileTo || (user?.role === 'admin' ? '/admin/profile' : '/officer/profile');

  const isItemActive = (item) => {
    if (item.activeKey === 'create-report') {
      return pathname === '/officer/reports/new';
    }

    if (item.activeKey === 'officer-reports') {
      return pathname === '/officer/reports' || (
        pathname.startsWith('/officer/reports/') && pathname !== '/officer/reports/new'
      );
    }

    if (item.activeKey === 'admin-reports') {
      return pathname === '/admin/reports' || pathname.startsWith('/admin/reports/');
    }

    return item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`);
  };

  const renderItem = (item) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      onClick={onClose}
      title={isCompact ? item.label : undefined}
      className={() => {
        const isActive = isItemActive(item);
        return `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${isCompact ? 'justify-center' : ''} ${
          isActive
            ? 'bg-police-blue-600/25 text-white shadow-sm before:absolute before:left-0 before:top-1 before:h-8 before:w-1 before:rounded-r before:bg-blue-400'
            : 'text-slate-200 hover:bg-white/5 hover:text-white'
        }`;
      }}
    >
      {item.icon && <item.icon size={18} />}
      {!isCompact && item.label}
    </NavLink>
  );

  const renderHistoryItem = (item) => (
    <Link
      key={item.to}
      to={item.to}
      onClick={onClose}
      title={item.label}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
        pathname === item.to
          ? 'bg-white/10 text-white font-semibold'
          : 'text-slate-300 hover:bg-white/5 hover:text-white'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          pathname === item.to ? 'bg-blue-400' : 'bg-slate-600'
        }`}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.status && (
        <span
          className={`shrink-0 text-[9px] font-bold uppercase tracking-wide ${
            item.status.toLowerCase() === 'draft' ? 'text-slate-500' : 'text-blue-400/80'
          }`}
        >
          {item.status}
        </span>
      )}
    </Link>
  );
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[#071426] text-white shadow-xl transition-[width,transform] duration-200 lg:static lg:translate-x-0 ${
          isCompact ? 'w-20' : 'w-72'
        } ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Branding */}
        <div className={`flex items-center justify-between border-b border-white/10 py-5 ${isCompact ? 'px-4' : 'px-5'}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <BrandMark size="sm" variant="dark" />
            {!isCompact && <div className="min-w-0">
              <p className="text-lg font-extrabold leading-tight tracking-wide text-white">{PRODUCT_NAME}</p>
              <p className="text-xs font-medium text-slate-300">{SIDEBAR_SUBTITLE}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-blue-300">{workspaceLabel}</p>
            </div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-300 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-scroll flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {navSections.map((section) => (
            <div key={section.label}>
              {!isCompact && <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{section.label}</p>}
              <div className="space-y-1">
                {section.items.map(renderItem)}
              </div>
            </div>
          ))}

          {/* Report history — Claude-style sortable list below the main nav */}
          {!isCompact && historySection && (
            <div className="pt-2">
              <div className="mb-1 flex items-center justify-between gap-2 px-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{historySection.label}</p>
                {historySection.sort && (
                  <select
                    value={historySection.sort.value}
                    onChange={(e) => historySection.sort.onChange(e.target.value)}
                    className="cursor-pointer rounded-md border border-white/10 bg-transparent px-1.5 py-0.5 text-[10px] font-semibold text-slate-300 outline-none transition-colors hover:border-white/25 hover:text-white focus:ring-1 focus:ring-blue-400"
                    aria-label={`Sort ${historySection.label}`}
                  >
                    {historySection.sort.options.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-[#071426] text-white">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="space-y-0.5">
                {historySection.items.length === 0 ? (
                  <p className="px-3 py-1.5 text-xs text-slate-500">No reports yet</p>
                ) : (
                  historySection.items.map(renderHistoryItem)
                )}
              </div>
              {historySection.viewAll && (
                <Link
                  to={historySection.viewAll.to}
                  onClick={onClose}
                  className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-blue-300 transition-colors hover:bg-white/5 hover:text-blue-200"
                >
                  {historySection.viewAll.label}
                </Link>
              )}
            </div>
          )}
        </nav>

        {/* Profile footer — Claude-style account area with popover menu */}
        <div className="relative border-t border-white/10 px-3 py-3">
          {isCompact ? (
            <NavLink
              to={resolvedProfileTo}
              title={displayName}
              className="flex items-center justify-center rounded-lg p-2 text-slate-200 transition-colors hover:bg-white/5 hover:text-white"
            >
              <CircleUser size={22} />
            </NavLink>
          ) : (
            <>
              {profileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setProfileMenuOpen(false)} aria-hidden="true" />
                  <div className="absolute bottom-full left-3 right-3 z-20 mb-2 rounded-xl border border-white/10 bg-[#0b2036] p-1.5 shadow-2xl">
                    <div className="border-b border-white/10 px-3 py-2">
                      <p className="truncate text-sm font-bold text-white">{displayName}</p>
                      <p className="truncate text-[11px] font-medium text-slate-400">{roleLabel}</p>
                    </div>
                    <NavLink
                      to={resolvedProfileTo}
                      onClick={() => setProfileMenuOpen(false)}
                      className={`mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                        pathname === resolvedProfileTo
                          ? 'bg-police-blue-600/25 text-white'
                          : 'text-slate-200 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <CircleUser size={16} />
                      Profile
                    </NavLink>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setShowLogoutConfirm(true);
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-red-500/10 hover:text-red-300"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                </>
              )}
              <button
                type="button"
                onClick={() => setProfileMenuOpen((open) => !open)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/5"
                title={displayName}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-police-blue-600/30 text-white ring-1 ring-white/20">
                  <CircleUser size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-white">{displayName}</span>
                  <span className="block truncate text-[11px] font-medium text-slate-400">{roleLabel}</span>
                </span>
                <ChevronRight
                  size={14}
                  className={`shrink-0 text-slate-400 transition-transform ${profileMenuOpen ? '-rotate-90' : 'rotate-90'}`}
                />
              </button>
            </>
          )}
        </div>

        <ConfirmDialog
          isOpen={showLogoutConfirm}
          onClose={() => setShowLogoutConfirm(false)}
          onConfirm={onLogout}
          title="Log out of BLUEWRITE?"
          description="You will need to sign in again to access your workspace. Any unsaved changes will be lost."
          confirmLabel="Log Out"
          variant="danger"
        />
      </aside>
    </>
  );
}

export default Sidebar;