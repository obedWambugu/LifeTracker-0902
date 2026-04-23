import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { User, Shield, Download, LogOut, Bell, Snowflake, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user, logout } = useAuth();
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
        <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-6">
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
                  onClick={() => updatePref('streakFreezePerWeek', n)}
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
