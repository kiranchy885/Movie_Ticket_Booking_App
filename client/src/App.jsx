
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Profile from "./pages/Profile";
import Home from "./pages/Home";
import Movies from "./pages/Movies";
import MovieDetail from "./pages/MovieDetail";
import SeatLayout from "./pages/SeatLayout";
import MyBooking from "./pages/MyBooking";
import Favorite from "./pages/Favorite";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Payment from "./pages/Payment";

import { Routes, Route, useLocation } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";

import Dashboard from "./pages/admin/Dashboard";
import AddShows from "./pages/admin/AddShows";
import ListBookings from "./pages/admin/ListBookings";
import ListShows from "./pages/admin/ListShows";
import Layout from "./pages/admin/Layout";

import { useAuth } from "./context/AuthContext";

const App = () => {
  const { pathname } = useLocation();

  const { admin, loading } = useAuth();

  const isAdminRoute = pathname.startsWith("/admin");
  const isAdmin = admin?.role === "admin";

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <>
      {/* ========================= */}
      {/* USER NAVBAR */}
      {/* ========================= */}

      {!isAdminRoute && <Navbar />}

      <Routes>

        {/* ========================= */}
        {/* PUBLIC PAGES */}
        {/* ========================= */}

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/home"
          element={<Home />}
        />

        <Route
          path="/movies"
          element={<Movies />}
        />

        <Route
          path="/movies/:id"
          element={<MovieDetail />}
        />

        {/* ========================= */}
        {/* SEAT SELECTION */}
        {/* ========================= */}

        <Route
          path="/movies/:id/:date"
          element={
            <ProtectedRoute>
              <SeatLayout />
            </ProtectedRoute>
          }
        />

        {/* ========================= */}
        {/* USER PAGES */}
        {/* ========================= */}

        <Route
          path="/my-booking"
          element={
            <ProtectedRoute>
              <MyBooking />
            </ProtectedRoute>
          }
        />

        <Route
          path="/favorite"
          element={
            <ProtectedRoute>
              <Favorite />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* ========================= */}
        {/* AUTH */}
        {/* ========================= */}

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/signup"
          element={<Signup />}
        />

        {/* ========================= */}
        {/* PAYMENT */}
        {/* ========================= */}

        <Route
          path="/payment/:bookingId"
          element={
            <ProtectedRoute>
              <Payment />
            </ProtectedRoute>
          }
        />

        {/* ========================= */}
        {/* ADMIN */}
        {/* ========================= */}

        <Route
          path="/admin/*"
          element={
            isAdmin ? (
              <Layout />
            ) : (
              <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <p className="text-gray-400 text-lg">
                  Admin Access Required...
                </p>
              </div>
            )
          }
        >
          {/* Admin Dashboard */}

          <Route
            index
            element={<Dashboard />}
          />

          {/* Add Shows */}

          <Route
            path="add-shows"
            element={<AddShows />}
          />

          {/* List Shows */}

          <Route
            path="list-shows"
            element={<ListShows />}
          />

          {/* List Bookings */}

          <Route
            path="list-bookings"
            element={<ListBookings />}
          />
        </Route>

        {/* ========================= */}
        {/* 404 PAGE */}
        {/* ========================= */}

        <Route
          path="*"
          element={
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold mb-3">
                  404
                </h1>

                <p className="text-gray-400">
                  Page not found
                </p>
              </div>
            </div>
          }
        />

      </Routes>

      {/* ========================= */}
      {/* USER FOOTER */}
      {/* ========================= */}

      {!isAdminRoute && <Footer />}
    </>
  );
};

export default App;

