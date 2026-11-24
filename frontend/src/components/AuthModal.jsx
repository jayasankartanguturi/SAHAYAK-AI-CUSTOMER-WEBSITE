import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import GoogleSignInButton from './ui/GoogleSignInButton';

export default function AuthModal({ open, onClose }) {
  const { loginUser, triggerLoginSuccess, selectedProfession, language } = useApp();
  const [mode, setMode] = useState('login'); // login | register
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'register' && password !== confirmPassword) {
      setError('Password and Confirm Password must match.');
      return;
    }
    setLoading(true);
    try {
      const res =
        mode === 'login'
          ? await api.login(email, password)
          : await api.register({
              name,
              email,
              password,
              profession: selectedProfession,
              language,
            });
      localStorage.setItem('sahayak_token', res.access_token);
      loginUser({ name: res.user.name, email: res.user.email });
      onClose();
      triggerLoginSuccess();
    } catch (err) {
      setError(err.message || 'Authentication failed. Ensure the FastAPI backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#171638]/40 backdrop-blur-xs">
      <div className="bg-white rounded-[28px] w-full max-w-md p-6 border border-[#ECEAF6] shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#F1EFF8] text-[#85839A]"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-[20px] font-bold text-[#171638]">
          {mode === 'login' ? 'Sign In to Sahayak AI' : 'Create Citizen Account'}
        </h2>
        <p className="text-[12.5px] text-[#85839A] mt-0.5">
          Secured with JWT authentication
        </p>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 text-rose-700 text-[12px] font-medium">
            {error}
          </div>
        )}

        <div className="mt-4">
          <GoogleSignInButton
            disabled={loading}
            onError={(msg) => setError(msg)}
            onCancel={(msg) => setError(msg)}
            onCredential={async (credential) => {
              setError('');
              setLoading(true);
              try {
                const res = await api.googleSignIn({ credential });
                if (res?.access_token && res?.user) {
                  localStorage.setItem('sahayak_token', res.access_token);
                  loginUser({ name: res.user.name, email: res.user.email });
                  onClose();
                  triggerLoginSuccess();
                }
              } catch (err) {
                setError(err?.message || 'Google authentication failed.');
              } finally {
                setLoading(false);
              }
            }}
          />
        </div>

        <div className="my-3.5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#ECEAF6]" />
          <span className="text-[11px] font-semibold text-[#85839A] uppercase">or</span>
          <div className="h-px flex-1 bg-[#ECEAF6]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="text-[12px] font-bold text-[#171638]">Full Name</label>
              <div className="mt-1 flex items-center gap-2 rounded-xl bg-[#FAF9FF] border border-[#ECEAF6] px-3 py-2">
                <UserIcon className="w-4 h-4 text-[#85839A]" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jayasankar"
                  className="w-full bg-transparent text-[13px] focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[12px] font-bold text-[#171638]">Email</label>
            <div className="mt-1 flex items-center gap-2 rounded-xl bg-[#FAF9FF] border border-[#ECEAF6] px-3 py-2">
              <Mail className="w-4 h-4 text-[#85839A]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="citizen@example.com"
                className="w-full bg-transparent text-[13px] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[12px] font-bold text-[#171638]">Password</label>
            <div className="mt-1 flex items-center gap-2 rounded-xl bg-[#FAF9FF] border border-[#ECEAF6] px-3 py-2">
              <Lock className="w-4 h-4 text-[#85839A]" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full bg-transparent text-[13px] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="text-[#85839A] hover:text-[#6336D9] transition-colors shrink-0 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="text-[12px] font-bold text-[#171638]">Confirm Password</label>
              <div className="mt-1 flex items-center gap-2 rounded-xl bg-[#FAF9FF] border border-[#ECEAF6] px-3 py-2">
                <Lock className="w-4 h-4 text-[#85839A]" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full bg-transparent text-[13px] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  className="text-[#85839A] hover:text-[#6336D9] transition-colors shrink-0 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-[11.5px] font-medium text-rose-600">
                  Passwords do not match.
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-full bg-gradient-to-r from-[#7650E8] to-[#6336D9] text-white text-[13.5px] font-semibold shadow-sm"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-4 text-center text-[12.5px] text-[#5A5778]">
          {mode === 'login' ? (
            <>
              New to Sahayak AI?{' '}
              <button
                onClick={() => setMode('register')}
                className="font-bold text-[#7650E8] hover:underline"
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => setMode('login')}
                className="font-bold text-[#7650E8] hover:underline"
              >
                Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

