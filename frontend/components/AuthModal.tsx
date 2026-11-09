// frontend/components/AuthModal.tsx - Authentication modal matching Saamba design identity

'use client';

import React, { useState } from 'react';
import { useAppStore } from '../lib/store';
import { supabase } from '../lib/supabaseClient';

export function AuthModal() {
  const { authModalOpen, setAuthModalOpen, setUser } = useAppStore();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!authModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        if (data.user) {
          setUser(data.user);
          setAuthModalOpen(false);
        }
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          setUser(data.user);
          setAuthModalOpen(false);
        } else if (data.user) {
          setMessage('Account created! Please check your email to confirm, or sign in.');
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
      open
      id="auth-modal"
      className="auth-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setAuthModalOpen(false);
        }
      }}
    >
      <div className="auth-modal-card">
        <div className="auth-header">
          <div className="eyebrow">Saamba Accounts</div>
          <h2>
            {mode === 'signin' ? 'Sign in to your account' : 'Create your workspace'}
            <span style={{ color: 'var(--brand-gold, #DEB569)' }}>.</span>
          </h2>
          <p className="auth-sub">
            {mode === 'signin'
              ? 'Enter your credentials to access your meetings and summaries.'
              : 'Sign up to get your own isolated workspace and cloud-synced recordings.'}
          </p>
        </div>

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

        {error && <div className="auth-alert error">{error}</div>}
        {message && <div className="auth-alert success">{message}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            <span>Email</span>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@profeshare.ai"
              className="auth-input"
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="auth-input"
            />
          </label>

          <div className="auth-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => setAuthModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="primary" disabled={loading}>
              {loading
                ? 'Processing...'
                : mode === 'signin'
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
