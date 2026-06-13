import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../common/Button';

const OTPModal = ({ isOpen, onClose, email, onSuccess, type = 'login' }) => {
  const { verifyOTP, verifyRegistrationOTP, resendOTP, loading, error } = useAuth();
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  // Timer for resend OTP
  useEffect(() => {
    if (timeLeft > 0 && isOpen) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      setCanResend(true);
    }
  }, [timeLeft, isOpen]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setOtpValues(['', '', '', '', '', '']);
      setTimeLeft(60);
      setCanResend(false);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleOTPChange = (index, value) => {
    if (!/^\d?$/.test(value)) return; // digits only
    const newOtpValues = [...otpValues];
    newOtpValues[index] = value;
    setOtpValues(newOtpValues);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const pastedNumbers = pastedData.replace(/\D/g, '').slice(0, 6);
    if (pastedNumbers.length === 6) {
      setOtpValues(pastedNumbers.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otp = otpValues.join('');
    if (otp.length !== 6) return;
    try {
      if (type === 'login') {
        await verifyOTP(email, otp);
      } else {
        await verifyRegistrationOTP(email, otp);
      }
      onSuccess();
    } catch (error) {
      setOtpValues(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResendOTP = async () => {
    try {
      await resendOTP(email);
      setTimeLeft(60);
      setCanResend(false);
    } catch (error) {
      // Error handled by context
    }
  };

  // Progress percentage for timer ring
  const progress = ((60 - timeLeft) / 60) * 100;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className="relative w-full max-w-md bg-[#111111] border border-white/[0.09] rounded-3xl shadow-2xl shadow-black/60 p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.06] transition-all"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-600/10 border border-primary-500/20 flex items-center justify-center mb-5 shadow-lg shadow-primary-500/10">
            <ShieldCheckIcon className="h-8 w-8 text-primary-400" />
          </div>
          <h3 className="text-2xl font-bold text-white tracking-tight">
            Verify your email
          </h3>
          <p className="text-sm text-neutral-400 mt-2 text-center leading-relaxed">
            We've sent a 6-digit code to{' '}
            <span className="text-primary-400 font-semibold">{email}</span>
          </p>
        </div>

        {/* OTP Inputs */}
        <div className="flex gap-3 justify-center mb-6">
          {otpValues.map((value, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength="1"
              value={value}
              onChange={(e) => handleOTPChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className={`
                w-12 h-14 text-center text-xl font-bold rounded-2xl border transition-all duration-200
                bg-[#1a1a1a] text-white
                focus:outline-none focus:scale-105
                ${value
                  ? 'border-primary-500/60 shadow-md shadow-primary-500/10 text-primary-300'
                  : 'border-white/[0.12] hover:border-white/[0.2]'
                }
              `}
              style={{ caretColor: 'transparent' }}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-danger-500/10 border border-danger-500/20">
            <p className="text-sm text-danger-400 text-center font-medium">{error}</p>
          </div>
        )}

        {/* Timer / Resend */}
        <div className="text-center mb-7">
          {canResend ? (
            <button
              onClick={handleResendOTP}
              disabled={loading}
              className="text-sm text-primary-400 hover:text-primary-300 font-semibold transition-colors hover:underline underline-offset-2 disabled:opacity-50"
            >
              Resend verification code
            </button>
          ) : (
            <p className="text-sm text-neutral-400">
              Resend code in{' '}
              <span className="font-bold text-neutral-200 tabular-nums">{timeLeft}s</span>
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleVerifyOTP}
            className="flex-1"
            loading={loading}
            disabled={loading || otpValues.join('').length !== 6}
          >
            Verify
          </Button>
        </div>

        {/* Subtle helper */}
        <p className="text-xs text-neutral-600 text-center mt-5">
          Didn't receive the email? Check your spam folder.
        </p>
      </div>
    </div>
  );
};

export default OTPModal;
