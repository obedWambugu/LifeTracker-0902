import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { User, Shield, Download, LogOut, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Could add PUT /auth/profile endpoint
      toast.success('Profile updated');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>Settings</h1>
        <p className="text-[#555] mt-1">Manage your account</p>
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

        {/* Account */}
        <div className="bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 p-6 border-b border-[#1f1f1f]">
            <div className="w-10 h-10 bg-[#5352ed]/10 rounded-xl flex items-center justify-center">
              <Shield size={18} className="text-[#5352ed]" />
            </div>
            <h2 className="text-white font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Account</h2>
          </div>

          <div>
            {[
              { label: 'Member since', value: user ? 'Recently joined' : '—', action: false },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a] last:border-0">
                <p className="text-[#888] text-sm">{item.label}</p>
                <p className="text-white text-sm">{item.value}</p>
              </div>
            ))}
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
          <div className="flex gap-3">
            <button onClick={() => toast.info('Export feature coming soon')} className="flex items-center gap-2 border border-[#222] text-[#888] hover:text-white hover:border-[#333] px-4 py-2.5 rounded-lg text-sm transition-colors">
              <Download size={14} /> Export data
            </button>
          </div>
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
