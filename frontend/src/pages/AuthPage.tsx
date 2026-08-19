import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useRouter } from '../router.js';
import { AlertCircle } from 'lucide-react';
import gradionLogo from '../assets/gradion-logo.png';

interface FieldErrors {
  name?: string;
  email?: string;
}

export const AuthPage: React.FC = () => {
  const { login } = useAuth();
  const { navigate } = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const validate = (): boolean => {
    const errors: FieldErrors = {};

    if (!name.trim()) {
      errors.name = 'Please enter your full name.';
    }

    if (!email.trim()) {
      errors.email = 'Please enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      await login(name.trim(), email.trim());
      navigate('/projects');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Login failed. Please try again.';
      setServerError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (fieldErrors.name) {
      setFieldErrors((prev) => ({ ...prev, name: undefined }));
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (fieldErrors.email) {
      setFieldErrors((prev) => ({ ...prev, email: undefined }));
    }
  };

  return (
    <div className="min-h-screen bg-grad-paper-2 flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] bg-white rounded-r-4 border border-grad-border-2 p-8 sm:p-10 shadow-card">
        {/* Brand Anchor */}
        <div className="text-center mb-8">
          <img
            src={gradionLogo}
            alt="Gradion"
            className="h-9 mx-auto object-contain"
          />
        </div>

        {/* Form with noValidate for Custom Error Experience */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {serverError && (
            <div className="p-3.5 rounded-r-2 bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="f-name"
              className="block text-sm font-semibold text-grad-ink mb-2"
            >
              Full name <span className="text-grad-orange">*</span>
            </label>
            <input
              id="f-name"
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="John Doe"
              className={`w-full px-4 py-3 rounded-r-2 border bg-white text-[15px] sm:text-base text-grad-ink placeholder:text-grad-ink-3/70 focus:outline-none transition-all font-sans ${
                fieldErrors.name
                  ? 'border-red-400 focus:ring-2 focus:ring-red-200 focus:border-red-500'
                  : 'border-grad-line/60 focus:ring-2 focus:ring-grad-orange/25 focus:border-grad-orange'
              }`}
            />
            {fieldErrors.name && (
              <p className="text-[13px] text-red-600 font-medium mt-1.5 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                <span>{fieldErrors.name}</span>
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="f-email"
              className="block text-sm font-semibold text-grad-ink mb-2"
            >
              Email address <span className="text-grad-orange">*</span>
            </label>
            <input
              id="f-email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="john@example.com"
              className={`w-full px-4 py-3 rounded-r-2 border bg-white text-[15px] sm:text-base text-grad-ink placeholder:text-grad-ink-3/70 focus:outline-none transition-all font-sans ${
                fieldErrors.email
                  ? 'border-red-400 focus:ring-2 focus:ring-red-200 focus:border-red-500'
                  : 'border-grad-line/60 focus:ring-2 focus:ring-grad-orange/25 focus:border-grad-orange'
              }`}
            />
            {fieldErrors.email && (
              <p className="text-[13px] text-red-600 font-medium mt-1.5 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                <span>{fieldErrors.email}</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-r-2 bg-grad-orange text-white font-bold text-[15px] hover:bg-grad-orange-hover transition-all shadow-sm disabled:opacity-50 mt-6 cursor-pointer tracking-wide"
          >
            {loading ? 'Continuing...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};
