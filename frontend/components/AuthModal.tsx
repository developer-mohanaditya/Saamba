// frontend/components/AuthModal.tsx - Authentication modal matching Saamba design identity

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../lib/store';
import { supabase } from '../lib/supabaseClient';

export function AuthModal() {
  const { authModalOpen, setAuthModalOpen, setUser, setToastMessage } = useAppStore();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (authModalOpen) {
      setError(null);
      setMessage(null);
      setVerificationSent(false);
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [authModalOpen]);

  if (!authModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        if (data.user) {
          setUser(data.user);
          setAuthModalOpen(false);
          setToastMessage(`✓ Welcome back, ${data.user.email}!`);
        }
      } else {
        const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          setUser(data.user);
          setAuthModalOpen(false);
          setToastMessage(`✓ Welcome to Saamba!`);
        } else if (data.user) {
          setVerificationSent(true);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (googleError) throw googleError;
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      id="auth-modal"
      className="auth-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setAuthModalOpen(false);
        }
      }}
      onCancel={(e) => {
        e.preventDefault();
        setAuthModalOpen(false);
      }}
    >
      <form id="auth-form" onSubmit={handleSubmit}>
        <div className="dialog-top">
          <div>
            <div className="eyebrow">Saamba Cloud</div>
            <h2>
              {mode === 'signin' ? 'Sign in to account' : 'Create your workspace'}
              <span className="brand-period">.</span>
            </h2>
            <p>
              {mode === 'signin'
                ? 'Enter your credentials to access your meetings, notes, and transcripts.'
                : 'Sign up to create an isolated workspace with cloud-synced recordings.'}
            </p>
          </div>
          <button
            type="button"
            className="close"
            id="close-auth-dialog"
            aria-label="Close"
            onClick={() => setAuthModalOpen(false)}
          >
            ×
          </button>
        </div>

        {verificationSent ? (
          <div className="auth-verification-box">
            <div className="auth-verification-icon">
              <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#28543b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <h3>Check your email to confirm</h3>
            <p className="auth-verification-email">
              We’ve sent an activation link to:
              <br />
              <strong>{email.trim()}</strong>
            </p>
            <p className="auth-verification-desc">
              Please click the confirmation link in the email. Once verified, you will be automatically signed in!
            </p>
            <div className="dialog-actions" style={{ justifyContent: 'center', marginTop: '20px' }}>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  setVerificationSent(false);
                  setMode('signin');
                  setAuthModalOpen(false);
                }}
              >
                Close & check inbox
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="auth-tabs">
              <button
                type="button"
                className={`auth-tab ${mode === 'signin' ? 'active' : ''}`}
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  setMessage(null);
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
                onClick={() => {
                  setMode('signup');
                  setError(null);
                  setMessage(null);
                }}
              >
                Create Account
              </button>
            </div>

            {/* Google OAuth One-Click Sign In */}
            <div className="oauth-container">
              <button
                type="button"
                className="oauth-button google-oauth-btn"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>

            <div className="auth-divider">
              <span>or continue with email</span>
            </div>

            {error && (
              <div className="error" role="alert" style={{ margin: '12px 0' }}>
                {error}
              </div>
            )}
            {message && (
              <div className="notice" role="status" style={{ margin: '12px 0' }}>
                {message}
              </div>
            )}

            <label htmlFor="auth-email-input">
              Email
              <input
                id="auth-email-input"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mohan.founder@profeshare.ai"
              />
            </label>

            <label htmlFor="auth-password-input">
              Password
              <input
                id="auth-password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
              />
            </label>

            <div className="dialog-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setAuthModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="primary" disabled={loading}>
                {loading
                  ? 'Processing…'
                  : mode === 'signin'
                  ? 'Sign In'
                  : 'Create Account'}
              </button>
            </div>
          </>
        )}
      </form>
    </dialog>
  );
}
