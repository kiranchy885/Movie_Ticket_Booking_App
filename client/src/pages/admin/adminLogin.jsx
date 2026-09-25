import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { ShieldCheck, UserPlus, LogIn, Key } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { loginAdmin, admin, loading: authLoading } = useAuth() || {};

  const [isSignUp, setIsSignUp] = useState(false);
  const [step, setStep] = useState(1); // 1: form, 2: verify OTP
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && admin) {
      navigate("/admin", { replace: true });
    }
  }, [admin, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
      </div>
    );
  }

  // ---------- Handle Sign In ----------
  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    try {
      setIsSubmitting(true);
      await loginAdmin(email.trim(), password);
      toast.success("Welcome back, Admin!");
      navigate("/admin", { replace: true });
    } catch (error) {
      console.error("Admin Login Error:", error);
      toast.error(error.message || "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------- Step 1: Request Registration (send OTP) ----------
  const handleRegisterRequest = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await fetch("http://localhost:5000/admin/register-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not send OTP.");
      toast.success("OTP sent to your email. Please check your inbox.");
      setStep(2);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------- Step 2: Verify OTP and set password ----------
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await fetch("http://localhost:5000/admin/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Verification failed.");
      toast.success("Admin account created! You can now sign in.");
      setStep(1);
      setIsSignUp(false); // switch to sign‑in mode
      setName("");
      setEmail("");
      setPassword("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------- Resend OTP ----------
  const handleResendOtp = async () => {
    try {
      const res = await fetch("http://localhost:5000/admin/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not resend OTP.");
      toast.success("OTP resent.");
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/20 via-black to-black pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/5 border border-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl">
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-primary/10 border border-primary/30 rounded-full text-primary">
              <ShieldCheck size={28} />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-white mb-1">
            Admin Portal
          </h1>
          <p className="text-gray-400 text-center mb-6 text-sm">
            {isSignUp
              ? step === 1
                ? "Create a new administrative account"
                : "Verify OTP and set your password"
              : "Sign in to manage movies, shows, and bookings"}
          </p>

          {/* Toggle buttons – visible only in step 1 of sign‑up and sign‑in */}
          {!(isSignUp && step === 2) && (
            <div className="flex bg-white/5 p-1 rounded-xl mb-6 border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setStep(1);
                }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 cursor-pointer ${
                  !isSignUp ? "bg-primary text-white shadow-md" : "text-gray-400 hover:text-white"
                }`}
              >
                <LogIn size={16} /> Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setStep(1);
                }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 cursor-pointer ${
                  isSignUp ? "bg-primary text-white shadow-md" : "text-gray-400 hover:text-white"
                }`}
              >
                <UserPlus size={16} /> Register
              </button>
            </div>
          )}

          {/* ========= SIGN IN FORM ========= */}
          {!isSignUp && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Admin Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm"
                  placeholder="admin@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-semibold transition text-sm mt-2 cursor-pointer"
              >
                {isSubmitting ? "Signing in..." : "Login to Admin Portal"}
              </button>
            </form>
          )}

          {/* ========= REGISTER – STEP 1 ========= */}
          {isSignUp && step === 1 && (
            <form onSubmit={handleRegisterRequest} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm"
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Admin Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm"
                  placeholder="admin@example.com"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-semibold transition text-sm mt-2 cursor-pointer"
              >
                {isSubmitting ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
          )}

          {/* ========= REGISTER – STEP 2 (Verify OTP & Set Password) ========= */}
          {isSignUp && step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
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
                disabled={isSubmitting}
                className="w-full py-2.5 bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-semibold transition text-sm mt-2 cursor-pointer"
              >
                {isSubmitting ? "Verifying..." : "Verify & Set Password"}
              </button>
              <p className="text-center text-sm text-gray-400">
                Didn't receive OTP?{" "}
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="text-primary hover:underline font-medium"
                >
                  Resend OTP
                </button>
              </p>
            </form>
          )}

          <p className="text-center text-gray-400 text-sm mt-6">
            Return to{" "}
            <Link to="/" className="text-primary hover:underline font-medium">
              Home Page
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;