import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { validateEmail, validateRequired } from "../../utils/helpers";
import Button from "../common/Button";
import Input from "../common/Input";
import OTPModal from "./OTPModal";
import Logo from "../common/Logo";

const LoginForm = () => {
  const navigate = useNavigate();
  const { login, loading, error, tempEmail, isAuthenticated, user } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);

  // Monitor authentication state changes and redirect
  useEffect(() => {
    if (isAuthenticated && user && !showOTPModal) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, user, showOTPModal, navigate]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;

    const passwordError = validateRequired(formData.password, "Password");
    if (passwordError) newErrors.password = passwordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const result = await login(formData.email, formData.password);

      if (result.requiresOTP) {
        setShowOTPModal(true);
      }
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  // Handle OTP success
  const handleOTPSuccess = () => {
    setShowOTPModal(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8">
      {/* Decorative Blurs */}
      <div className="absolute top-0 inset-x-0 h-screen overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-10 -left-10 w-96 h-96 rounded-full bg-primary-500/10 filter blur-[120px]"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-accent/10 filter blur-[120px]"></div>
      </div>

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="max-w-md w-full relative z-10"
      >
        <div className="glass-panel p-8 md:p-10 shadow-2xl">
          {/* Back to Home */}
          <div className="mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-300 hover:text-primary-400 transition-colors group"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 group-hover:-translate-x-1 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Home
            </Link>
          </div>

          <div className="text-center mb-10">
            <Link
              to="/"
              className="inline-block hover:scale-105 transition-transform"
            >
              <Logo className="mx-auto h-16 w-16" showText={false} />
            </Link>
            <h2 className="mt-6 text-3xl font-extrabold text-white tracking-tight">
              Welcome back
            </h2>
            <p className="mt-3 text-sm text-neutral-400">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-semibold text-primary-400 hover:text-primary-300 transition-colors"
              >
                Sign up here
              </Link>
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-5">
              <Input
                label="Email Address"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                placeholder="Enter your email"
              />

              <div className="relative">
                <Input
                  label="Password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  error={errors.password}
                  placeholder="Enter your password"
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
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="font-semibold text-primary-400 hover:text-primary-300 transition-colors"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-danger-500/10 border border-danger-500/20 p-4"
              >
                <div className="text-sm text-danger-400 font-medium">
                  {error}
                </div>
              </motion.div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full h-14 text-lg mt-4"
              loading={loading}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
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
          type="login"
        />
      )}
    </div>
  );
};

export default LoginForm;
