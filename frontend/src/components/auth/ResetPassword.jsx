import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../common/Button';
import Input from '../common/Input';
import Logo from '../common/Logo';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { resetPassword, loading, error } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setErrors({ form: 'Reset token is missing. Please request a new link.' });
      return;
    }

    if (!validateForm()) return;

    try {
      await resetPassword(token, formData.password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      // Error handled by context
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
            <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-2xl bg-success-500/10 border border-success-500/20 shadow-lg shadow-success-500/10 mb-6">
              <svg className="h-10 w-10 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Password Reset
            </h2>
            <p className="mt-3 text-sm text-neutral-400 leading-relaxed">
              Your password has been reset successfully! Redirecting you to login...
            </p>
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
          <div className="text-center mb-8">
            <Link to="/" className="inline-block hover:scale-105 transition-transform">
              <Logo className="mx-auto h-16 w-16" showText={false} />
            </Link>
            <h2 className="mt-6 text-3xl font-extrabold text-white tracking-tight">
              Reset password
            </h2>
            <p className="mt-3 text-sm text-neutral-500">
              Enter your new password below.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {errors.form && (
              <div className="rounded-xl bg-danger-500/10 border border-danger-500/20 p-4">
                <div className="text-sm text-danger-400">{errors.form}</div>
              </div>
            )}

            <div className="relative">
              <Input
                label="New Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                placeholder="Create new password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center mt-6 transition-colors hover:text-primary-400"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-neutral-500" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-neutral-500" />
                )}
              </button>
            </div>

            <div className="relative">
              <Input
                label="Confirm Password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
                placeholder="Confirm password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center mt-6 transition-colors hover:text-primary-400"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-neutral-500" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-neutral-500" />
                )}
              </button>
            </div>

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
              {loading ? 'Resetting...' : 'Reset password'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
