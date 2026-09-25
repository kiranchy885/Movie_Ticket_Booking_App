import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { assets } from "../assets/assets";
import { useAuth } from "../context/AuthContext";

const DISPOSABLE_DOMAINS = [
  "mailinator.com", "guerrillamail.com", "10minutemail.com",
  "tempmail.com", "throwawaymail.com", "yopmail.com",
  "temp-mail.org", "sharklasers.com", "grr.la", "guerrillamail.org",
];

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  const isValidEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) return false;
    const domain = email.split("@")[1].toLowerCase();
    return !DISPOSABLE_DOMAINS.includes(domain);
  };

  const isValidMobile = (mobile) => {
    const re = /^[0-9]{10}$/;
    return re.test(mobile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase(); // Force lowercase validation
    const trimmedMobile = mobile.trim();

    if (!trimmedName || !trimmedEmail || !trimmedMobile) {
      setError("Please fill in all fields.");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setError("Please enter a valid email address (no disposable/temporary emails).");
      return;
    }

    if (!isValidMobile(trimmedMobile)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);

    try {
      await signup(trimmedName, trimmedEmail, trimmedMobile);
      // Redirect to OTP verification page, passing email
      navigate("/verify-otp", {
        state: { email: trimmedEmail },
        replace: true,
      });
    } catch (err) {
      console.error("Signup error:", err);
      setError(err.message || "Could not create account. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // Google Login Hook to fetch profile details and auto-fill the form
  const handleGoogleSignup = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);
        setError("");

        // Fetch user profile info from Google using the access token
        const userInfoRes = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          }
        );

        if (!userInfoRes.ok) {
          throw new Error("Failed to fetch Google profile information.");
        }

        const googleUser = await userInfoRes.json();

        if (googleUser?.name) {
          setName(googleUser.name);
        }

        if (googleUser?.email) {
          // Enforce lowercase validation for Gmail/email
          setEmail(googleUser.email.toLowerCase());
        }
      } catch (err) {
        console.error("Google fetch profile error:", err);
        setError("Failed to fetch details from Google. Please enter them manually.");
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setError("Google sign-in was cancelled or failed.");
    },
    prompt: "select_account",
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/20 via-black to-black pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link to="/">
            <img src={assets.logo} alt="Logo" className="w-36 h-auto" />
          </Link>
        </div>

        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-1">Create Account</h1>
          <p className="text-gray-400 text-sm mb-6">
            Book tickets, save favorites, and more
          </p>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Google Sign-In Button to Auto-fetch Info */}
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 transition text-white text-sm disabled:opacity-50 mb-5"
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
            </svg>
            Continue with Google
          </button>

          <div className="relative flex items-center my-6">
            <div className="flex-1 border-t border-white/10"></div>
            <span className="px-3 text-xs text-gray-500">OR WITH EMAIL</span>
            <div className="flex-1 border-t border-white/10"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-gray-300 mb-1.5" htmlFor="signup-name">
                Full Name
              </label>
              <input
                id="signup-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1.5" htmlFor="signup-email">
                Email Address
              </label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())} // Enforce lowercase on type as well
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1.5" htmlFor="signup-mobile">
                Mobile Number
              </label>
              <input
                id="signup-mobile"
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="9876543210"
                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm"
                required
              />
            </div>

            <p className="text-sm text-gray-400 -mt-2">
              An OTP will be sent to your email to verify your account.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary hover:bg-primary-dull disabled:opacity-50 disabled:cursor-not-allowed transition rounded-lg font-semibold text-white text-sm"
            >
              {loading ? "Processing..." : "Continue"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;