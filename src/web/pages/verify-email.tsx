import { useEffect, useMemo, useState } from 'react';
import { useSearch } from 'wouter';
import { CheckCircle2, Mail, RefreshCw, ShieldCheck, Sparkles, ArrowRight, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useNavigate } from '../lib/navigate';

export default function VerifyEmailPage() {
  const search = useSearch();
  const navigate = useNavigate();
  const { user, setSession, logout } = useAuth();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const token = params.get('token');
  const initialEmail = params.get('email') || user?.email || '';

  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(!!token);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verificationLink, setVerificationLink] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('lt_verification_link');
    } catch {
      return null;
    }
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    if (!token || verified) return;

    let active = true;
    const verify = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.post('/auth/verify-email', { token });
        if (!active) return;
        setSession(data.token, data.user);
        sessionStorage.removeItem('lt_verification_link');
        setVerified(true);
        toast.success('Email verified successfully');
        navigate('/dashboard', { replace: true });
      } catch (err: any) {
        if (!active) return;
        setError(err.message || 'Verification failed');
        toast.error(err.message || 'Verification failed');
        setLoading(false);
      }
    };

    verify();
    return () => {
      active = false;
    };
  }, [navigate, setSession, token, verified]);

  const resend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Enter your email address');
      return;
    }

    setResending(true);
    setError(null);
    try {
      const data = await api.post('/auth/resend-verification', { email: email.trim() });
      if (data.verificationLink) {
        setVerificationLink(data.verificationLink);
        sessionStorage.setItem('lt_verification_link', data.verificationLink);
      } else {
        sessionStorage.removeItem('lt_verification_link');
      }
      toast.success(data.message || 'Verification email sent');
    } catch (err: any) {
      setError(err.message || 'Could not resend verification email');
      toast.error(err.message || 'Could not resend verification email');
    } finally {
      setResending(false);
    }
  };

  if (loading && token) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center px-6">
        <div className="max-w-md w-full rounded-3xl border border-[#1f1f1f] bg-[#111] p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00ff88]/10 text-[#00ff88]">
            <RefreshCw size={24} className="animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
            Verifying your email
          </h1>
          <p className="mt-3 text-sm text-[#888]">
            Please wait while we confirm your verification link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-[#1f1f1f] bg-[radial-gradient(circle_at_top_left,_rgba(0,255,136,0.12),_transparent_35%),linear-gradient(180deg,#111,#0b0b0b)] p-8 md:p-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#00ff88]/20 bg-[#00ff88]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#00ff88]">
              <Sparkles size={12} />
              Email verification
            </div>

            <h1 className="max-w-xl text-3xl font-bold text-white md:text-5xl" style={{ fontFamily: 'Syne, sans-serif' }}>
              Verify your inbox to start the 30-day trial.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#a1a1a1] md:text-base">
              Your account only becomes active after you click the verification link we send to your email.
              Once verified, your 30-day trial starts automatically and you can sign in normally.
            </p>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {[
                { label: 'Trial start', value: 'After verification' },
                { label: 'Access', value: 'Full features' },
                { label: 'Free plan', value: 'Starts later' },
              ].map(item => (
                <div key={item.label} className="rounded-2xl border border-[#1f1f1f] bg-[#0d0d0d] p-4">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[#666]">{item.label}</p>
                  <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-[#1f1f1f] bg-[#0d0d0d] p-6 md:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00ff88]/10 text-[#00ff88]">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                  {token ? 'Almost there' : 'Check your email'}
                </h2>
                <p className="text-sm text-[#777]">
                  {token ? 'We are confirming your verification link now.' : 'We sent a link to verify your account.'}
                </p>
              </div>
            </div>

            {verified ? (
              <div className="rounded-2xl border border-[#00ff88]/20 bg-[#00ff88]/5 p-5 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00ff88]/10 text-[#00ff88]">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-lg font-semibold text-white">Email verified</h3>
                <p className="mt-2 text-sm text-[#888]">Redirecting you to the dashboard.</p>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-[#1f1f1f] bg-[#111] p-5">
                  <p className="text-sm font-medium text-white">
                    {user?.email || email || 'Your email address'}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[#888]">
                    If you do not see the message, check spam or request a new verification email below.
                  </p>
                </div>

                <form onSubmit={resend} className="mt-5 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm text-[#888]">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-[#222] bg-[#080808] px-4 py-3 text-white placeholder:text-[#444] focus:border-[#00ff88] focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={resending}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00ff88] px-4 py-3 font-semibold text-[#080808] transition-colors hover:bg-[#00cc6a] disabled:opacity-50"
                  >
                    {resending ? 'Sending...' : 'Resend verification email'}
                    {!resending && <Mail size={16} />}
                  </button>
                </form>
              </>
            )}

            {verificationLink && (
              <div className="mt-5 rounded-2xl border border-[#00ff88]/20 bg-[#00ff88]/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#00ff88]">Local dev link</p>
                <p className="mt-2 text-sm text-[#bdbdbd]">
                  Email sending is not configured locally, so use this verification link to continue testing.
                </p>
                <a
                  href={verificationLink}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#00ff88]/20 bg-[#00ff88]/10 px-4 py-2 text-sm font-semibold text-[#00ff88] transition-colors hover:bg-[#00ff88]/15"
                >
                  Open verification link
                  <ExternalLink size={14} />
                </a>
              </div>
            )}

            {error && (
              <div className="mt-5 rounded-2xl border border-[#ff4757]/20 bg-[#ff4757]/10 p-4 text-sm text-[#ffb6bf]">
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => navigate('/auth')}
                className="inline-flex items-center gap-2 text-sm font-medium text-[#888] transition-colors hover:text-white"
              >
                Back to sign in
                <ArrowRight size={14} />
              </button>

              {user && (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/auth');
                  }}
                  className="text-sm font-medium text-[#ff6b81] transition-colors hover:text-[#ff8797]"
                >
                  Use a different account
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
