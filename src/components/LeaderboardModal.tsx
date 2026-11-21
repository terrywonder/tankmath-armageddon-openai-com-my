import React, { useState } from 'react';
import {
  Cloud,
  LogIn,
  LogOut,
  Mail,
  RefreshCw,
  Trophy,
  WifiOff,
  X,
} from 'lucide-react';
import type { LeaderboardEntry, PlayerSaveData } from '../game/types';

const TANK_COLORS = [
  { hex: '#2563EB', label: 'Cobalt' },
  { hex: '#059669', label: 'Emerald' },
  { hex: '#D97706', label: 'Amber' },
  { hex: '#7C3AED', label: 'Violet' },
  { hex: '#DB2777', label: 'Crimson' },
];

interface LeaderboardModalProps {
  open: boolean;
  onClose: () => void;
  entries: LeaderboardEntry[];
  loading: boolean;
  errorMsg: string | null;
  save: PlayerSaveData;
  userEmail: string | null;
  isSignedIn: boolean;
  isOnline: boolean;
  syncing: boolean;
  onRefresh: () => void;
  onSignIn: () => void;
  onSignUpWithEmail?: (email: string, password: string, displayName?: string) => Promise<void>;
  onSignInWithEmail?: (email: string, password: string) => Promise<void>;
  onResetPassword?: (email: string) => Promise<void>;
  onSignOut: () => void;
  onUpdateProfile: (displayName: string, tankColor: string) => void;
  onSyncNow: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  open,
  onClose,
  entries,
  loading,
  errorMsg,
  save,
  userEmail,
  isSignedIn,
  isOnline,
  syncing,
  onRefresh,
  onSignIn,
  onSignUpWithEmail,
  onSignInWithEmail,
  onResetPassword,
  onSignOut,
  onUpdateProfile,
  onSyncNow,
}) => {
  const [nameInput, setNameInput] = useState(save.displayName);
  const [colorInput, setColorInput] = useState(save.tankColor);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailMode, setEmailMode] = useState<'signup' | 'signin' | 'reset'>('signup');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);

  if (!open) return null;

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailFeedback(null);
    const trimmedEmail = emailInput.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailFeedback({ kind: 'error', text: 'Please enter a valid email address (Outlook, Yahoo, iCloud, .edu.my, Gmail, etc.).' });
      return;
    }
    if (emailMode === 'signup' && passwordInput.length < 6) {
      setEmailFeedback({ kind: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    setEmailBusy(true);
    try {
      if (emailMode === 'signup' && onSignUpWithEmail) {
        await onSignUpWithEmail(trimmedEmail, passwordInput, nameInput || save.displayName);
        setEmailFeedback({ kind: 'ok', text: 'Account created! Check your mailbox for the verification link.' });
        setShowEmailForm(false);
      } else if (emailMode === 'signin' && onSignInWithEmail) {
        await onSignInWithEmail(trimmedEmail, passwordInput);
        setShowEmailForm(false);
      } else if (emailMode === 'reset' && onResetPassword) {
        await onResetPassword(trimmedEmail);
        setEmailFeedback({ kind: 'ok', text: `Password reset email sent to ${trimmedEmail}.` });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('email-already-in-use')) {
        setEmailFeedback({ kind: 'error', text: 'Email already registered. Switch to "Sign In" or reset password.' });
      } else if (msg.includes('invalid-credential') || msg.includes('wrong-password')) {
        setEmailFeedback({ kind: 'error', text: 'Incorrect email or password. Try again or reset password.' });
      } else {
        setEmailFeedback({ kind: 'error', text: 'Could not sign in with that email right now. Please try again.' });
      }
    } finally {
      setEmailBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global Leaderboard and Cloud Sync"
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#090714]/80 p-3 sm:p-6"
    >
      <div className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border-2 border-[#312E81] bg-[#140F2D] text-white shadow-[0_8px_0_#090714]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#312E81] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Trophy className="h-6 w-6 text-amber-400" />
            <div>
              <h2 className="font-display text-xl font-extrabold text-white">
                Global Math Geniuses &amp; Cloud Sync
              </h2>
              <p className="text-xs text-indigo-300">
                Cross-device O.A.I. progress synchronization for desktop, tablet, and mobile.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close leaderboard"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#312E81] bg-[#1E1742] text-indigo-200 hover:bg-[#292059] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Cloud Sync & Commander Profile Section */}
          <section className="rounded-xl border border-[#312E81] bg-[#1E1742]/60 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
                  <Cloud className={`h-4 w-4 ${isSignedIn && isOnline ? 'text-emerald-400' : 'text-sky-400'}`} />
                  <span>Cross-Device Cloud Save</span>
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  {isSignedIn
                    ? `Signed in (${userEmail ?? 'Scholar Account'}) · Last synced from ${save.lastSyncedDevice}`
                    : 'Sign in with any email (Outlook, Yahoo, iCloud, .edu.my) or Google to back up your score and unlocked shells across devices.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {!isOnline && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400">
                    <WifiOff className="h-3.5 w-3.5" />
                    Offline Cache
                  </span>
                )}
                {isSignedIn ? (
                  <>
                    <button
                      type="button"
                      disabled={!isOnline || syncing}
                      onClick={onSyncNow}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-700 bg-sky-500 px-3.5 py-2 text-xs font-extrabold text-slate-950 hover:bg-sky-400 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                      <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={onSignOut}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={!isOnline}
                      onClick={() => {
                        setShowEmailForm((prev) => !prev);
                        setEmailFeedback(null);
                      }}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-slate-950 bg-amber-400 px-3.5 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-300 disabled:opacity-50"
                    >
                      <Mail className="h-4 w-4" />
                      <span>Email Sign Up / In</span>
                    </button>
                    <button
                      type="button"
                      disabled={!isOnline}
                      onClick={onSignIn}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-slate-950 bg-emerald-400 px-3.5 py-2 text-xs font-extrabold text-slate-950 hover:bg-emerald-300 disabled:opacity-50"
                    >
                      <LogIn className="h-4 w-4" />
                      <span>Google</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {!isSignedIn && showEmailForm && (
              <form
                onSubmit={(e) => void handleEmailAuthSubmit(e)}
                className="mt-4 space-y-3 rounded-xl border border-indigo-500/35 bg-[#120D28] p-3.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-bold text-amber-300">
                    All Mailboxes Supported (Outlook, Yahoo, iCloud, .edu.my, Gmail)
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-bold">
                    {(['signup', 'signin', 'reset'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setEmailMode(m);
                          setEmailFeedback(null);
                        }}
                        className={`rounded-lg px-2.5 py-1 ${
                          emailMode === m
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        {m === 'signup' ? 'Create' : m === 'signin' ? 'Sign In' : 'Reset'}
                      </button>
                    ))}
                  </div>
                </div>
                {emailFeedback && (
                  <div
                    role="alert"
                    className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                      emailFeedback.kind === 'error'
                        ? 'bg-rose-950/70 text-rose-200 border border-rose-500/40'
                        : 'bg-emerald-950/70 text-emerald-200 border border-emerald-500/40'
                    }`}
                  >
                    {emailFeedback.text}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="you@outlook.com, yahoo.com, edu.my..."
                    className="min-h-[42px] rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                  {emailMode !== 'reset' && (
                    <input
                      type="password"
                      required
                      minLength={emailMode === 'signup' ? 6 : 1}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder={emailMode === 'signup' ? 'Password (min. 6 chars)' : 'Password'}
                      className="min-h-[42px] rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs text-white focus:border-amber-400 focus:outline-none"
                    />
                  )}
                </div>
                <button
                  type="submit"
                  disabled={emailBusy}
                  className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-300 disabled:opacity-50"
                >
                  {emailBusy
                    ? 'Please wait...'
                    : emailMode === 'signup'
                      ? 'Create Account with Email'
                      : emailMode === 'signin'
                        ? 'Sign In with Email'
                        : 'Send Password Reset Email'}
                </button>
              </form>
            )}

            {/* Commander Callsign & Tank Color */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!nameInput.trim()) return;
                onUpdateProfile(nameInput.trim().slice(0, 40), colorInput);
              }}
              className="mt-4 flex flex-col sm:flex-row sm:items-end gap-3 border-t border-slate-800 pt-4"
            >
              <div className="flex-1">
                <label
                  htmlFor="commander-callsign"
                  className="block text-xs font-bold text-slate-300"
                >
                  Commander Callsign
                </label>
                <input
                  id="commander-callsign"
                  type="text"
                  maxLength={40}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm font-semibold text-white focus:border-sky-400 focus:outline-none"
                  placeholder="Enter callsign"
                />
              </div>

              <div>
                <span className="block text-xs font-bold text-slate-300">Tank Paint</span>
                <div className="mt-1 flex items-center gap-2">
                  {TANK_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      aria-label={`Select ${c.label} tank paint`}
                      aria-pressed={colorInput === c.hex}
                      onClick={() => setColorInput(c.hex)}
                      className={`h-10 w-10 rounded-xl border-2 transition-transform ${
                        colorInput === c.hex
                          ? 'scale-105 border-white'
                          : 'border-slate-950 opacity-75 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="min-h-[44px] rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-extrabold text-white hover:bg-slate-700 whitespace-nowrap"
              >
                Save Profile
              </button>
            </form>
          </section>

          {/* Leaderboard Table */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-white">
                Top Math Commanders
              </h3>
              <button
                type="button"
                disabled={loading || !isOnline}
                onClick={onRefresh}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-slate-800 px-3 text-xs font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {errorMsg && (
              <div className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300">
                {errorMsg}
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-xs font-bold uppercase text-slate-400">
                  <tr>
                    <th className="px-3.5 py-2.5">Rank</th>
                    <th className="px-3.5 py-2.5">Commander</th>
                    <th className="px-3.5 py-2.5 text-right">Best Score</th>
                    <th className="px-3.5 py-2.5 text-right">Peak Tier</th>
                    <th className="px-3.5 py-2.5 text-right">Accuracy</th>
                    <th className="px-3.5 py-2.5 text-right">Streak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900">
                  {entries.map((entry, idx) => (
                    <tr key={entry.userId} className="hover:bg-slate-800/60">
                      <td className="px-3.5 py-2.5 font-mono-tabular font-extrabold text-amber-300">
                        #{idx + 1}
                      </td>
                      <td className="px-3.5 py-2.5 font-bold text-white">
                        {entry.displayName}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono-tabular font-bold text-emerald-300">
                        {entry.bestScore}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono-tabular text-sky-300">
                        T{entry.highestTier}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono-tabular text-slate-200">
                        {entry.accuracyPct}%
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono-tabular text-violet-300">
                        {entry.bestStreak}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
