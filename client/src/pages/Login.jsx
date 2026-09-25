import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { assets } from "../assets/assets";
import { useAuth } from "../context/AuthContext";

const DISPOSABLE_DOMAINS = [
  "mailinator.com", "guerrillamail.com", "10minutemail.com",
  "tempmail.com", "throwawaymail.com", "yopmail.com",
  "temp-mail.org", "sharklasers.com", "grr.la", "guerrillamail.org",
];

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isValidEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) return false;
    const domain = email.split("@")[1].toLowerCase();
    return !DISPOSABLE_DOMAINS.includes(domain);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setError("Please enter a valid email address (no disposable/temporary emails).");
      return;
    }

    setLoading(true);

    try {
      const result = await login(trimmedEmail, password);
      const loggedInUser = result?.user || result;

      if (result?.token) {
        localStorage.setItem("userToken", result.token);
      }

      if (!loggedInUser) {
        throw new Error("Login succeeded, but user context was not returned.");
      }

      const from = location.state?.from;
      if (from && typeof from === "string") {
        navigate(from, { replace: true });
        return;
      }

      navigate("/", { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      const message = err.message || "Unable to sign in. Please verify your credentials.";
      if (message.toLowerCase().includes("verify") || message.toLowerCase().includes("unverified")) {
        setError("Your email is not verified. Please check your inbox for a verification link.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/20 via-black to-black pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link to="/">
            <img src={assets.logo} alt="Logo" className="w-36 h-auto" />
          </Link>
        </div>

        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl">
          <h1 className="text-2xl font-bold text-white mb-1">Sign In</h1>
          <p className="text-gray-400 text-sm mb-6">
            Sign in to access your bookings and account settings.
          </p>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="block text-sm text-gray-300 mb-1.5">
                Email / Username
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm text-gray-300 mb-1.5">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm"
                required
              />
            </div>

            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:underline transition"
              >
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary hover:bg-primary-dull disabled:opacity-50 disabled:cursor-not-allowed transition rounded-lg font-semibold text-white text-sm"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline font-medium">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;