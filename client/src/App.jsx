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

// Admin
import AdminLogin from "./pages/admin/AdminLogin";
import Dashboard from "./pages/admin/Dashboard";
import AddShows from "./pages/admin/AddShows";
import ListBookings from "./pages/admin/ListBookings";
import ListShows from "./pages/admin/ListShows";
import Layout from "./pages/admin/Layout";

const App = () => {
  const { pathname } = useLocation();

  const isAdminRoute = pathname.startsWith("/admin");

  return (
    <>
      {/* User Navbar */}
      {!isAdminRoute && <Navbar />}

      <Routes>

        {/* =========================
            USER ROUTES
        ========================= */}

        <Route path="/" element={<Home />} />

        <Route path="/home" element={<Home />} />

        <Route path="/movies" element={<Movies />} />

        <Route
          path="/movies/:id"
          element={<MovieDetail />}
        />

        <Route
          path="/movies/:id/:date"
          element={
            <ProtectedRoute>
              <SeatLayout />
            </ProtectedRoute>
          }
        />

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

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/signup"
          element={<Signup />}
        />

        <Route
          path="/payment/:bookingId"
          element={
            <ProtectedRoute>
              <Payment />
            </ProtectedRoute>
          }
        />


        {/* =========================
            ADMIN LOGIN
            PUBLIC ROUTE
        ========================= */}

        <Route
          path="/admin/login"
          element={<AdminLogin />}
        />


        {/* =========================
            ADMIN DASHBOARD
        ========================= */}

        <Route
          path="/admin/dashboard"
          element={<Layout />}
        >
          <Route
            index
            element={<Dashboard />}
          />
        </Route>


        {/* =========================
            ADMIN ADD SHOWS
        ========================= */}

        <Route
          path="/admin/add-shows"
          element={<Layout />}
        >
          <Route
            index
            element={<AddShows />}
          />
        </Route>


        {/* =========================
            ADMIN LIST SHOWS
        ========================= */}

        <Route
          path="/admin/list-shows"
          element={<Layout />}
        >
          <Route
            index
            element={<ListShows />}
          />
        </Route>


        {/* =========================
            ADMIN LIST BOOKINGS
        ========================= */}

        <Route
          path="/admin/list-bookings"
          element={<Layout />}
        >
          <Route
            index
            element={<ListBookings />}
          />
        </Route>


        {/* =========================
            ADMIN ROOT
        ========================= */}

        <Route
          path="/admin"
          element={<Layout />}
        >
          <Route
            index
            element={<Dashboard />}
          />
        </Route>


        {/* =========================
            404
        ========================= */}

        <Route
          path="*"
          element={
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
              <div className="text-center">

                <h1 className="text-5xl font-bold mb-4">
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

      {/* User Footer */}
      {!isAdminRoute && <Footer />}
    </>
  );
};

export default App;