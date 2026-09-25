import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { assets } from "../assets/assets";

const VerifyOtp = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  // Get email from location state (passed from Signup)
  const email = location.state?.email || "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email) {
      setError("Email not found. Please go back and sign up again.");
      return;
    }
    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/user/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Verification failed.");
      setSuccess("✅ Email verified and password set! Redirecting to login...");
      setTimeout(() => navigate("/login?verified=true"), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendMsg("");
    if (!email) {
      setError("Email not found.");
      return;
    }
    try {
      const res = await fetch("http://localhost:5000/user/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not resend OTP.");
      setResendMsg("✅ OTP resent to your email.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/20 via-black to-black pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src={assets.logo} alt="Logo" className="w-36 h-auto" />
        </div>

        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl">
          <h1 className="text-2xl font-bold text-white mb-1">Verify OTP</h1>
          <p className="text-gray-400 text-sm mb-6">
            Enter the 6-digit code sent to your email and choose a new password.
          </p>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
              {success}
            </div>
          )}
          {resendMsg && (
            <div className="mb-4 px-4 py-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-sm">
              {resendMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/10 text-gray-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1.5">OTP Code</label>
              <input
                type="text"
                maxLength="6"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1.5">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary hover:bg-primary-dull disabled:opacity-50 disabled:cursor-not-allowed transition rounded-lg font-semibold text-white text-sm"
            >
              {loading ? "Verifying..." : "Verify & Set Password"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Didn't receive OTP?{" "}
            <button
              type="button"
              onClick={handleResendOtp}
              className="text-primary hover:underline font-medium"
            >
              Resend OTP
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;