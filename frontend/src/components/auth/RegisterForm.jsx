import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon, UserIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import Button from '../common/Button';
import Input from '../common/Input';
import { useAuth } from '../../contexts/AuthContext';
import OTPModal from './OTPModal';
import Logo from "../common/Logo";

const RegisterForm = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'customer'
  });
  const [loading, setLoading] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tempEmail, setTempEmail] = useState('');

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

  const validateRequired = (value, fieldName) => {
    if (!value || value.trim() === '') return `${fieldName} is required`;
    return null;
  };

  const validateEmail = (email) => {
    if (!email) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return null;
  };

  const validatePhone = (phone) => {
    if (!phone) return 'Phone number is required';
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) return 'Please enter a valid phone number';
    return null;
  };

  const validatePassword = (password) => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters long';
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return 'Password must contain at least one uppercase letter, lowercase letter, and number';
    }
    return null;
  };

  const validateForm = () => {
    const newErrors = {};

    const nameError = validateRequired(formData.name, 'Name');
    if (nameError) newErrors.name = nameError;

    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;

    const phoneError = validatePhone(formData.phone);
    if (phoneError) newErrors.phone = phoneError;

    const passwordError = validatePassword(formData.password);
    if (passwordError) newErrors.password = passwordError;

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const result = await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role,
      });
      
      if (result && result.requiresOTP === false) {
        navigate('/login');
      } else {
        setTempEmail(formData.email);
        setShowOTPModal(true);
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSuccess = () => {
    setShowOTPModal(false);
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Blurs */}
      <div className="absolute top-0 inset-x-0 h-screen overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[10%] right-[10%] w-[40%] h-[40%] rounded-full bg-primary-500/10 filter blur-[120px]"></div>
        <div className="absolute bottom-[10%] -left-[10%] w-[35%] h-[35%] rounded-full bg-accent/10 filter blur-[120px]"></div>
      </div>

      <motion.div 
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        className="max-w-xl w-full relative z-10"
      >
        <div className="glass-panel p-8 md:p-10 shadow-2xl">
          {/* Back to Home */}
          <div className="mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-300 hover:text-primary-400 transition-colors group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
          </div>

          <div className="text-center mb-10">
             <Link to="/" className="inline-block hover:scale-105 transition-transform">
               <Logo className="mx-auto h-16 w-16" showText={false} />
             </Link>
            <h2 className="mt-6 text-3xl font-extrabold text-white tracking-tight">
              Create your account
            </h2>
            <p className="mt-3 text-sm text-neutral-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-primary-400 hover:text-primary-300 transition-colors"
              >
                Sign in here
              </Link>
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-semibold text-neutral-400 mb-3">
                I want to register as:
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: 'customer' }))}
                  className={`p-5 border-2 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-300 ${
                    formData.role === 'customer'
                      ? 'border-primary-500/50 bg-primary-500/10 text-primary-400 shadow-lg shadow-primary-500/10 transform -translate-y-1'
                      : 'border-white/[0.08] bg-white/[0.03] text-neutral-400 hover:border-primary-500/30 hover:bg-white/[0.05]'
                  }`}
                >
                  <UserIcon className="w-8 h-8" />
                  <div>
                    <div className="font-bold text-base">Customer</div>
                    <div className="text-xs text-neutral-500 mt-1">Need assistance</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: 'mechanic' }))}
                  className={`p-5 border-2 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-300 ${
                    formData.role === 'mechanic'
                      ? 'border-primary-500/50 bg-primary-500/10 text-primary-400 shadow-lg shadow-primary-500/10 transform -translate-y-1'
                      : 'border-white/[0.08] bg-white/[0.03] text-neutral-400 hover:border-primary-500/30 hover:bg-white/[0.05]'
                  }`}
                >
                  <WrenchScrewdriverIcon className="w-8 h-8" />
                  <div>
                    <div className="font-bold text-base">Mechanic</div>
                    <div className="text-xs text-neutral-500 mt-1">Provide service</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-5 pt-4 border-t border-white/[0.06]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label="Full Name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  error={errors.name}
                  placeholder="John Doe"
                />

                <Input
                  label="Phone Number"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  error={errors.phone}
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <Input
                label="Email Address"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                placeholder="john@example.com"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="relative">
                  <Input
                    label="Password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                    placeholder="Create password"
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
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="rounded-xl bg-danger-500/10 border border-danger-500/20 p-4"
              >
                <div className="text-sm text-danger-400 font-medium">{error}</div>
              </motion.div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full h-14 text-lg mt-6"
              loading={loading}
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </Button>

            <div className="text-xs text-neutral-500 text-center font-medium">
              By creating an account, you agree to our{' '}
              <Link to="/terms" className="text-primary-400 hover:text-primary-300 underline underline-offset-2">
                Terms
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-primary-400 hover:text-primary-300 underline underline-offset-2">
                Privacy Policy
              </Link>
            </div>
          </form>
        </div>
      </motion.div>

      {/* OTP Modal */}
      {showOTPModal && (
        <OTPModal
          isOpen={showOTPModal}
          onClose={() => setShowOTPModal(false)}
          email={tempEmail}
          onSuccess={handleOTPSuccess}
          type="register"
        />
      )}
    </div>
  );
};

export default RegisterForm;
