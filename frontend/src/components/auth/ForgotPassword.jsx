import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { validateEmail } from '../../utils/helpers';
import Button from '../common/Button';
import Input from '../common/Input';
import Logo from '../common/Logo';

const ForgotPassword = () => {
  const { forgotPassword, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const emailValidationError = validateEmail(email);
    if (emailValidationError) {
      setEmailError(emailValidationError);
      return;
    }

    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (error) {
      // Error is handled by the context
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (emailError) {
      setEmailError('');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Decorative Blurs */}
        <div className="absolute top-0 inset-x-0 h-screen overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-10 -left-10 w-96 h-96 rounded-full bg-success-500/10 filter blur-[120px]"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-primary-500/10 filter blur-[120px]"></div>
        </div>
        <div className="max-w-md w-full">
          <div className="glass-panel p-10 text-center shadow-2xl">
            {/* Styled check icon */}
            <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-2xl bg-success-500/10 border border-success-500/20 shadow-lg shadow-success-500/10 mb-6">
              <svg className="h-10 w-10 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Check your email
            </h2>
            <p className="mt-3 text-sm text-neutral-400 leading-relaxed">
              We've sent password reset instructions to{' '}
              <span className="text-primary-400 font-semibold">{email}</span>
            </p>
            <p className="mt-2 text-xs text-neutral-600">
              Didn't receive it? Check your spam folder.
            </p>
            <div className="mt-8 pt-6 border-t border-white/[0.06]">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 font-semibold text-primary-400 hover:text-primary-300 transition-colors group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8">
      {/* Decorative Blurs */}
      <div className="absolute top-0 inset-x-0 h-screen overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-10 -left-10 w-96 h-96 rounded-full bg-primary-500/10 filter blur-[120px]"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-accent/10 filter blur-[120px]"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="glass-panel p-8 md:p-10 shadow-2xl">
          {/* Back button */}
          <div className="mb-6">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-400 hover:text-primary-400 transition-colors group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to sign in
            </Link>
          </div>

          <div className="text-center mb-8">
            <Link to="/" className="inline-block hover:scale-105 transition-transform">
              <Logo className="mx-auto h-16 w-16" showText={false} />
            </Link>
            <h2 className="mt-6 text-3xl font-extrabold text-white tracking-tight">
              Forgot your password?
            </h2>
            <p className="mt-3 text-sm text-neutral-500">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <Input
              label="Email Address"
              name="email"
              type="email"
              required
              value={email}
              onChange={handleEmailChange}
              error={emailError}
              placeholder="Enter your email"
            />

            {error && (
              <div className="rounded-xl bg-danger-500/10 border border-danger-500/20 p-4">
                <div className="text-sm text-danger-400">{error}</div>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full h-14 text-lg"
              loading={loading}
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
