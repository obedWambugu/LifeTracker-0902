import { Link, useLocation, useRoute } from 'wouter';
import { useNavigate } from '../lib/navigate';
import { useAuth } from '../lib/auth';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, CheckSquare, DollarSign,
  BookOpen, Settings, LogOut, Zap, Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerInstall, isInstallable, isStandalone } from '../lib/pwa';
import { toast } from 'sonner';
import ReminderBridge from './ReminderBridge';

const nav = [
  { href: '/dashboard', label: 'Home',     icon: LayoutDashboard },
  { href: '/habits',    label: 'Habits',   icon: CheckSquare },
  { href: '/expenses',  label: 'Expenses', icon: DollarSign },
  { href: '/journal',   label: 'Journal',  icon: BookOpen },
  { href: '/settings',  label: 'Settings', icon: Settings },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [installable, setInstallable] = useState(false);

  useEffect(() => {
    setInstallable(isInstallable());
    const onInstallable = () => setInstallable(true);
    const onInstalled  = () => setInstallable(false);
    window.addEventListener('pwa-installable', onInstallable);
    window.addEventListener('pwa-installed',   onInstalled);
    return () => {
      window.removeEventListener('pwa-installable', onInstallable);
      window.removeEventListener('pwa-installed',   onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    const accepted = await triggerInstall();
    if (accepted) toast.success('Life Tracker installed!');
  };

  return (
    <div className="flex min-h-screen min-h-[100dvh] bg-[#080808]">

      {/* ── Desktop Sidebar ─────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-[220px] border-r border-[#1f1f1f] bg-[#0d0d0d] sticky top-0 h-screen shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-6 border-b border-[#1f1f1f]">
          <div className="w-8 h-8 bg-[#00ff88] rounded-lg flex items-center justify-center shrink-0">
            <Zap size={15} className="text-[#080808]" fill="currentColor" />
          </div>
          <span className="font-bold text-white text-base leading-none" style={{ fontFamily: 'Syne, sans-serif' }}>
            Life Tracker
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = location === href || location.startsWith(href + '/');
            return (
              <Link key={href} href={href} className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium no-underline transition-all duration-150',
                active
                  ? 'bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20'
                  : 'text-[#666] hover:text-white hover:bg-[#1a1a1a] border border-transparent'
              )}>
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Install banner */}
        {installable && !isStandalone() && (
          <div className="mx-3 mb-3">
            <button
              onClick={handleInstall}
              className="w-full flex items-center gap-2 bg-[#00ff88]/5 border border-[#00ff88]/20 text-[#00ff88] px-3 py-2.5 rounded-lg text-xs font-medium hover:bg-[#00ff88]/10 transition-colors"
            >
              <Download size={13} />
              Install app
            </button>
          </div>
        )}

        {/* User */}
        <div className="px-3 py-4 border-t border-[#1f1f1f]">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-[#00ff88]/20 flex items-center justify-center text-[#00ff88] text-sm font-bold shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.name}</p>
              <p className="text-[#444] text-xs truncate">{user?.email}</p>
            </div>
            <button onClick={logout} className="text-[#444] hover:text-[#ff4757] transition-colors p-1">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────── */}
      <main className="flex-1 overflow-auto pb-[72px] md:pb-0" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }}>
        {/* Mobile top bar — logo only */}
        <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 bg-[#080808]/90 backdrop-blur-md border-b border-[#1a1a1a]" style={{ paddingTop: 'calc(12px + env(safe-area-inset-top))', paddingBottom: '12px' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#00ff88] rounded-lg flex items-center justify-center">
              <Zap size={13} className="text-[#080808]" fill="currentColor" />
            </div>
            <span className="font-bold text-white text-sm" style={{ fontFamily: 'Syne, sans-serif' }}>Life Tracker</span>
          </div>
          {installable && !isStandalone() && (
            <button
              onClick={handleInstall}
              className="flex items-center gap-1.5 bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88] px-3 py-1.5 rounded-lg text-xs font-medium"
            >
              <Download size={11} />
              Install
            </button>
          )}
        </div>

        {children}
      </main>

      {/* ── Mobile Bottom Nav ───────────────────────────── */}
      <BottomNav location={location} />
      <ReminderBridge />
    </div>
  );
}

function BottomNav({ location }: { location: string }) {
  const navigate = useNavigate();
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d0d0d]/95 backdrop-blur-lg border-t border-[#1f1f1f] flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {nav.map(({ href, label, icon: Icon }) => {
        const active = location === href || location.startsWith(href + '/');
        return (
          <button
            key={href}
            onClick={() => navigate(href)}
            className={cn(
              'relative flex-1 flex flex-col items-center justify-center gap-1 py-3 bg-transparent border-none cursor-pointer transition-all active:scale-95',
              active ? 'text-[#00ff88]' : 'text-[#444]'
            )}
          >
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#00ff88] rounded-full" />
            )}
            <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
