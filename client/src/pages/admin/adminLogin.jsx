import React, { useState } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const API_URL = "http://localhost:5000";

const AdminLogin = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      console.log("Admin login response:", data);

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Admin login failed"
        );
      }

      // Save admin token
      localStorage.setItem(
        "adminToken",
        data.token
      );

      localStorage.setItem(
  "adminToken",
  data.token
);

localStorage.setItem(
  "admin",
  JSON.stringify(data.admin)
);

toast.success("Admin login successful");

navigate("/admin/dashboard");
    } catch (error) {
      console.error("Admin login error:", error);

      toast.error(
        error.message || "Invalid admin credentials"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f] px-4">

      <div className="w-full max-w-md">

        {/* Logo / Title */}

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">
            Admin Login
          </h1>

          <p className="text-gray-400 mt-2">
            Movie Ticket Booking System
          </p>
        </div>

        {/* Login Card */}

        <div className="bg-[#181818] border border-gray-800 rounded-xl p-8 shadow-xl">

          <form onSubmit={handleSubmit}>

            {/* Email */}

            <div className="mb-5">

              <label className="block text-gray-300 text-sm mb-2">
                Admin Email
              </label>

              <div className="relative">

                <Mail
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                />

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="Enter admin email"
                  className="w-full bg-[#101010] border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white outline-none focus:border-primary"
                />

              </div>

            </div>

            {/* Password */}

            <div className="mb-6">

              <label className="block text-gray-300 text-sm mb-2">
                Password
              </label>

              <div className="relative">

                <Lock
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                />

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter admin password"
                  className="w-full bg-[#101010] border border-gray-700 rounded-lg py-3 pl-10 pr-12 text-white outline-none focus:border-primary"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>

              </div>

            </div>

            {/* Login Button */}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dull text-white py-3 rounded-lg font-medium transition disabled:opacity-50"
            >
              {loading
                ? "Logging in..."
                : "Login as Admin"}
            </button>

          </form>

          {/* Back to User Login */}

          <button
            onClick={() => navigate("/login")}
            className="w-full mt-5 text-sm text-gray-400 hover:text-white transition"
          >
            ← Back to User Login
          </button>

        </div>

      </div>

    </div>
  );
};

export default AdminLogin;