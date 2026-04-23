import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { User, Shield, Download, LogOut, Bell, Snowflake, Mail, Crown, Phone, Check, Zap, BarChart2, Sparkles, Infinity } from 'lucide-react';
import { toast } from 'sonner';
import { PremiumBadge } from '../components/UpgradeModal';

export default function SettingsPage() {
  const { user, logout, isPremium } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<any>(null);
  const [prefsLoading, setPrefsLoading] = useState(true);

  useEffect(() => {
    loadPrefs();
  }, []);

  const loadPrefs = async () => {
    try {
      const p = await api.get('/preferences');
      setPrefs(p);
    } catch {
      // Prefs might not exist yet
      setPrefs({ remindersEnabled: false, reminderTime: '20:00', weeklyReportEnabled: true, streakFreezePerWeek: 1 });
    } finally {
      setPrefsLoading(false);
    }
  };

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      toast.success('Profile updated');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const updatePref = async (key: string, value: any) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    try {
      await api.put('/preferences', { [key]: value });
      toast.success('Preferences saved');
    } catch (e: any) {
      toast.error(e.message);
      loadPrefs(); // revert
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>Settings</h1>
        <p className="text-[#555] mt-1">Manage your account & preferences</p>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#00ff88]/10 rounded-xl flex items-center justify-center">
              <User size={18} className="text-[#00ff88]" />
            </div>
            <h2 className="text-white font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Profile</h2>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-[#00ff88]/20 rounded-2xl flex items-center justify-center">
              <span className="text-[#00ff88] text-2xl font-bold">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
            <div>
              <p className="text-white font-semibold">{user?.name}</p>
              <p className="text-[#555] text-sm">{user?.email}</p>
            </div>
          </div>

          <form onSubmit={saveName} className="space-y-4">
            <div>
              <label className="block text-sm text-[#888] mb-1.5">Display name</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#00ff88] transition-colors" />
            </div>
            <div>
              <label className="block text-sm text-[#888] mb-1.5">Email</label>
              <input value={user?.email} disabled className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-4 py-3 text-[#555] cursor-not-allowed" />
            </div>
            <button type="submit" disabled={saving} className="bg-[#00ff88] text-[#080808] px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#00cc6a] transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </form>
        </div>

        {/* Subscription */}
        <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#00ff88]/10 rounded-xl flex items-center justify-center">
              <Crown size={18} className="text-[#00ff88]" />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-white font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Subscription</h2>
              {isPremium && <PremiumBadge />}
            </div>
          </div>

          {isPremium ? (
            <div>
              <div className="bg-gradient-to-br from-[#00ff88]/5 to-[#5352ed]/5 border border-[#00ff88]/20 rounded-xl p-5 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Crown size={16} className="text-[#00ff88]" />
                  <p className="text-white font-semibold">Life Tracker Pro</p>
                </div>
                <p className="text-[#888] text-sm">You have full access to all premium features.</p>
                {user?.premiumUntil && (
                  <p className="text-[#555] text-xs mt-2">Active until {new Date(user.premiumUntil).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: <Infinity size={14} />, label: 'Unlimited habits' },
                  { icon: <BarChart2 size={14} />, label: 'Insights & analytics' },
                  { icon: <Sparkles size={14} />, label: 'Journal prompts' },
                  { icon: <Snowflake size={14} />, label: 'Streak freezes' },
                ].map(f => (
                  <div key={f.label} className="flex items-center gap-2 text-[#888] text-xs">
                    <Check size={12} className="text-[#00ff88]" /> {f.label}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl p-5 mb-4">
                <p className="text-[#888] text-sm mb-1">Current plan</p>
                <p className="text-white text-lg font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Free</p>
                <p className="text-[#555] text-xs mt-1">5 habits max · No insights · No prompts · No streak freezes</p>
              </div>

              <div className="bg-gradient-to-br from-[#00ff88]/5 to-[#5352ed]/5 border border-[#00ff88]/20 rounded-xl p-5 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-white font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Upgrade to Pro</p>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-bold text-[#00ff88]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>KES 149</span>
                      <span className="text-[#555] text-xs">/month</span>
                    </div>
                  </div>
                  <Crown size={28} className="text-[#00ff88]/30" />
                </div>

                <div className="space-y-2 mb-4">
                  {[
                    { icon: <Infinity size={13} />, label: 'Unlimited habits' },
                    { icon: <BarChart2 size={13} />, label: 'Correlation insights' },
                    { icon: <Sparkles size={13} />, label: 'Journal prompts library' },
                    { icon: <Snowflake size={13} />, label: 'Streak freezes' },
                    { icon: <Zap size={13} />, label: 'Advanced analytics' },
                  ].map(f => (
                    <div key={f.label} className="flex items-center gap-2 text-sm">
                      <span className="text-[#00ff88]">{f.icon}</span>
                      <span className="text-[#ccc]">{f.label}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-[#080808] border border-[#1a1a1a] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Phone size={14} className="text-[#00ff88]" />
                    <p className="text-white text-sm font-semibold">Pay via M-Pesa</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#555]">Paybill Number</span>
                      <span className="text-white font-mono">247247</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#555]">Account Number</span>
                      <span className="text-white font-mono text-xs">{user?.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#555]">Amount</span>
                      <span className="text-[#00ff88] font-mono font-bold">KES 149</span>
                    </div>
                  </div>
                </div>

                <p className="text-[#444] text-xs text-center mt-3">
                  After payment, your account will be upgraded within 24 hours.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Reminders & Notifications */}
        <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#ffa502]/10 rounded-xl flex items-center justify-center">
              <Bell size={18} className="text-[#ffa502]" />
            </div>
            <h2 className="text-white font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Reminders</h2>
          </div>

          {prefsLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-5">
              {/* Daily Reminder Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">Daily Reminders</p>
                  <p className="text-[#555] text-xs mt-0.5">Get reminded to log your habits & journal</p>
                </div>
                <button
                  onClick={() => updatePref('remindersEnabled', !prefs?.remindersEnabled)}
                  className={`w-12 h-7 rounded-full transition-colors relative ${prefs?.remindersEnabled ? 'bg-[#00ff88]' : 'bg-[#333]'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform ${prefs?.remindersEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Reminder Time */}
              {prefs?.remindersEnabled && (
                <div className="pl-0">
                  <label className="block text-sm text-[#888] mb-1.5">Reminder time</label>
                  <input
                    type="time"
                    value={prefs?.reminderTime || '20:00'}
                    onChange={e => updatePref('reminderTime', e.target.value)}
                    className="bg-[#0d0d0d] border border-[#222] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#00ff88] transition-colors"
                  />
                </div>
              )}

              {/* Weekly Report Toggle */}
              <div className="flex items-center justify-between pt-3 border-t border-[#1a1a1a]">
                <div>
                  <p className="text-white text-sm font-medium flex items-center gap-2">
                    <Mail size={14} className="text-[#5352ed]" /> Weekly Report
                  </p>
                  <p className="text-[#555] text-xs mt-0.5">Receive a weekly summary of your progress</p>
                </div>
                <button
                  onClick={() => updatePref('weeklyReportEnabled', !prefs?.weeklyReportEnabled)}
                  className={`w-12 h-7 rounded-full transition-colors relative ${prefs?.weeklyReportEnabled ? 'bg-[#00ff88]' : 'bg-[#333]'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform ${prefs?.weeklyReportEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Streak Freeze Settings */}
        <div className={`bg-[#111] border rounded-xl p-6 relative ${isPremium ? 'border-[#1f1f1f]' : 'border-[#1f1f1f] opacity-60'}`}>
          {!isPremium && (
            <div className="absolute top-4 right-4">
              <PremiumBadge small />
            </div>
          )}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#70a1ff]/10 rounded-xl flex items-center justify-center">
              <Snowflake size={18} className="text-[#70a1ff]" />
            </div>
            <h2 className="text-white font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Streak Freeze</h2>
          </div>

          <p className="text-[#888] text-sm mb-4">Streak freezes protect your streaks on off days. They're automatically applied when you miss a habit.</p>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">Freezes per week</p>
              <p className="text-[#555] text-xs mt-0.5">How many times per week you can freeze each habit</p>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3].map(n => (
                <button
                  key={n}
                  onClick={() => isPremium ? updatePref('streakFreezePerWeek', n) : toast.info('Upgrade to Pro to use streak freezes')}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                    prefs?.streakFreezePerWeek === n
                      ? 'bg-[#70a1ff] text-white'
                      : 'bg-[#1a1a1a] text-[#555] hover:text-white hover:bg-[#222]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Account */}
        <div className="bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 p-6 border-b border-[#1f1f1f]">
            <div className="w-10 h-10 bg-[#5352ed]/10 rounded-xl flex items-center justify-center">
              <Shield size={18} className="text-[#5352ed]" />
            </div>
            <h2 className="text-white font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Account</h2>
          </div>
          <div>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
              <p className="text-[#888] text-sm">Member since</p>
              <p className="text-white text-sm">{user ? 'Recently joined' : '—'}</p>
            </div>
          </div>
        </div>

        {/* Data */}
        <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-[#ffa502]/10 rounded-xl flex items-center justify-center">
              <Download size={18} className="text-[#ffa502]" />
            </div>
            <h2 className="text-white font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Your Data</h2>
          </div>
          <p className="text-[#555] text-sm mb-4">All your data belongs to you. Export or delete at any time.</p>
          <button onClick={() => toast.info('Export feature coming soon')} className="flex items-center gap-2 border border-[#222] text-[#888] hover:text-white hover:border-[#333] px-4 py-2.5 rounded-lg text-sm transition-colors">
            <Download size={14} /> Export data
          </button>
        </div>

        {/* Danger */}
        <div className="bg-[#111] border border-[#ff4757]/20 rounded-xl p-6">
          <h2 className="text-[#ff4757] font-bold mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>Danger Zone</h2>
          <button
            onClick={() => { if (confirm('Are you sure you want to log out?')) logout(); }}
            className="flex items-center gap-2 bg-[#ff4757]/10 text-[#ff4757] border border-[#ff4757]/20 px-4 py-2.5 rounded-lg text-sm hover:bg-[#ff4757]/20 transition-colors"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
