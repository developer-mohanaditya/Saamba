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
