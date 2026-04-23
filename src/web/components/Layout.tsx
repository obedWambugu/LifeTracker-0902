import { Link, useLocation } from 'wouter';
import { useAuth } from '../lib/auth';
import {
  LayoutDashboard,
  CheckSquare,
  DollarSign,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  X,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/habits', label: 'Habits', icon: CheckSquare },
  { href: '/expenses', label: 'Expenses', icon: DollarSign },
  { href: '/journal', label: 'Journal', icon: BookOpen },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#080808]">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-[220px] border-r border-[#1f1f1f] bg-[#0d0d0d] sticky top-0 h-screen">
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-6 border-b border-[#1f1f1f]">
          <div className="w-8 h-8 bg-[#00ff88] rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-[#080808]" fill="currentColor" />
          </div>
          <span className="font-bold text-white text-base" style={{ fontFamily: 'Syne, sans-serif' }}>
            Life Tracker
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = location === href || location.startsWith(href + '/');
            return (
              <Link key={href} href={href}>
                <a className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20'
                    : 'text-[#888] hover:text-white hover:bg-[#1a1a1a]'
                )}>
                  <Icon size={17} />
                  {label}
                </a>
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-[#1f1f1f]">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-[#00ff88]/20 flex items-center justify-center text-[#00ff88] text-sm font-bold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.name}</p>
              <p className="text-[#555] text-xs truncate">{user?.email}</p>
            </div>
            <button onClick={logout} className="text-[#555] hover:text-[#ff4757] transition-colors">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0d0d0d] border-b border-[#1f1f1f] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#00ff88] rounded-lg flex items-center justify-center">
            <Zap size={13} className="text-[#080808]" fill="currentColor" />
          </div>
          <span className="font-bold text-white text-sm" style={{ fontFamily: 'Syne, sans-serif' }}>Life Tracker</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-white p-1">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-[#0d0d0d] pt-16">
          <nav className="px-4 py-4 space-y-1">
            {nav.map(({ href, label, icon: Icon }) => {
              const active = location === href;
              return (
                <Link key={href} href={href}>
                  <a onClick={() => setMobileOpen(false)} className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                    active ? 'bg-[#00ff88]/10 text-[#00ff88]' : 'text-[#888] hover:text-white'
                  )}>
                    <Icon size={18} />
                    {label}
                  </a>
                </Link>
              );
            })}
            <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-[#ff4757] hover:bg-[#ff4757]/10 transition-all">
              <LogOut size={18} />
              Logout
            </button>
          </nav>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 overflow-auto md:pt-0 pt-14">
        {children}
      </main>
    </div>
  );
}
