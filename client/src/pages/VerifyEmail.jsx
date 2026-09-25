import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("Verifying your email...");

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await fetch(`http://localhost:5000/user/verify/${token}`);
        const data = await res.json();
        if (res.ok && data.success) {
          setStatus("✅ Email verified! Redirecting to login...");
          setTimeout(() => navigate("/login?verified=true"), 2000);
        } else {
          setStatus("❌ Verification failed: " + (data.message || "Invalid token"));
        }
      } catch (error) {
        setStatus("❌ Server error. Please try again.");
      }
    };
    verify();
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Email Verification</h1>
        <p>{status}</p>
      </div>
    </div>
  );
};

export default VerifyEmail;   // ✅ Must be default export