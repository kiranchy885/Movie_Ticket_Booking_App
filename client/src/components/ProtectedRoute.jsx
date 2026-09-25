import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { user, admin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Loading...
      </div>
    );
  }

  // Automatically catch admin routes via path or allowedRoles
  const isTargetingAdmin =
    allowedRoles.includes("admin") || location.pathname.startsWith("/admin");

  // 1. Handle Admin Routes
  if (isTargetingAdmin) {
    if (!admin) {
      return <Navigate to="/admin/login" replace state={{ from: location }} />;
    }
    // Admin is authenticated and authorized
    return <Outlet />;
  }

  // 2. Handle Standard User Routes
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 3. Check role authorization for normal users
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;