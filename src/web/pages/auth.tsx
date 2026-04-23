import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { Zap, ArrowRight, Eye, EyeOff, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from '../lib/navigate';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        return;
      } else {
        if (!name.trim()) {
          toast.error('Name required');
          setLoading(false);
          return;
        }
        const result = await register(email, name, password);
        if (result?.verificationRequired) {
          if (result.verificationLink) {
            sessionStorage.setItem('lt_verification_link', result.verificationLink);
          } else {
            sessionStorage.removeItem('lt_verification_link');
          }
          toast.success(result.message || 'We sent a verification email to your inbox.');
          navigate(`/auth/verify?email=${encodeURIComponent(email.trim())}`);
          return;
        }
      }
    } catch (err: any) {
      if (err.code === 'EMAIL_NOT_VERIFIED') {
        sessionStorage.removeItem('lt_verification_link');
        toast.error('Please verify your email before signing in.');
        navigate(`/auth/verify?email=${encodeURIComponent(email.trim())}`);
        return;
      }
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-[#0d0d0d] border-r border-[#1f1f1f] p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#00ff88] rounded-xl flex items-center justify-center">
            <Zap size={18} className="text-[#080808]" fill="currentColor" />
          </div>
          <span className="font-bold text-white text-xl" style={{ fontFamily: 'Syne, sans-serif' }}>Life Tracker</span>
        </div>

        <div>
          <h1 className="text-5xl font-bold text-white leading-tight mb-6" style={{ fontFamily: 'Syne, sans-serif' }}>
            Track every<br />
            dimension of<br />
            <span className="text-[#00ff88]">your life.</span>
          </h1>
          <p className="text-[#666] text-lg leading-relaxed max-w-sm">
            Habits, expenses, and journal - unified. Every verified account starts with a 30-day trial, then keeps a free ad-supported plan.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Habits', value: '∞', desc: 'Track unlimited' },
            { label: 'Trial', value: '30', desc: 'Days of full access' },
            { label: 'Privacy', value: '100%', desc: 'Your data only' },
          ].map(item => (
            <div key={item.label} className="bg-[#111] rounded-xl p-4 border border-[#222]">
              <p className="text-[#00ff88] text-2xl font-bold font-mono">{item.value}</p>
              <p className="text-white text-sm font-medium mt-1">{item.label}</p>
              <p className="text-[#555] text-xs mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 bg-[#00ff88] rounded-xl flex items-center justify-center">
              <Zap size={16} className="text-[#080808]" fill="currentColor" />
            </div>
            <span className="font-bold text-white text-lg" style={{ fontFamily: 'Syne, sans-serif' }}>Life Tracker</span>
          </div>

          <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
            {mode === 'login' ? 'Welcome back' : 'Get started'}
          </h2>
          <p className="text-[#666] mb-8">
            {mode === 'login' ? 'Sign in to continue your trial or Pro account' : 'Create your 30-day trial account'}
          </p>

          <div className="mb-6 flex items-start gap-3 rounded-xl border border-[#00ff88]/15 bg-[#00ff88]/5 p-4 text-sm text-[#b9b9b9]">
            <Mail size={16} className="mt-0.5 shrink-0 text-[#00ff88]" />
            <p>
              Registration sends a verification email first. Your 30-day trial starts only after you click the link in your inbox.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm text-[#888] mb-1.5">Full name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Alex Johnson"
                  className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-3 text-white placeholder-[#444] focus:outline-none focus:border-[#00ff88] transition-colors"
                />
              </div>
            )}
            <div>
              <label className="block text-sm text-[#888] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-3 text-white placeholder-[#444] focus:outline-none focus:border-[#00ff88] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-[#888] mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-3 pr-11 text-white placeholder-[#444] focus:outline-none focus:border-[#00ff88] transition-colors"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#888]">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00ff88] text-[#080808] font-semibold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-[#00cc6a] transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? 'Loading...' : mode === 'login' ? 'Sign in' : 'Create account'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <p className="text-center text-[#555] text-sm mt-6">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-[#00ff88] hover:underline">
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
