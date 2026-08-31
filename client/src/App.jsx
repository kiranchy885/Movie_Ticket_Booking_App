import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Movies from "./pages/Movies";
import MovieDetail from "./pages/MovieDetail";
import SeatLayout from "./pages/SeatLayout";
import MyBooking from "./pages/MyBooking";
import Favorite from "./pages/Favorite";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import MovieCenter from "./pages/MovieCenter";

import {
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";

// Admin pages
import Dashboard from "./pages/admin/Dashboard";
import AddShows from "./pages/admin/AddShows";
import ListBookings from "./pages/admin/ListBookings";
import ListShows from "./pages/admin/ListShows";
import Layout from "./pages/admin/Layout";

import { useAppContext } from "./context/AppContext";


// ======================================================
// APP
// ======================================================

const App = () => {
  const { pathname } = useLocation();

  const isAdminRoute =
    pathname.startsWith("/admin");

  const { user } = useAppContext();

  return (
    <>
      {/* ==================================================
          NAVBAR
      ================================================== */}

      {!isAdminRoute && <Navbar />}


      {/* ==================================================
          ROUTES
      ================================================== */}

      <Routes>

        {/* HOME */}
        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/home"
          element={<Home />}
        />


        {/* MOVIES */}
        <Route
          path="/movies"
          element={<Movies />}
        />

        <Route
          path="/movies/:id"
          element={<MovieDetail />}
        />


        {/* SEAT LAYOUT */}
        <Route
          path="/movies/:id/:date"
          element={
            <ProtectedRoute>
              <SeatLayout />
            </ProtectedRoute>
          }
        />


        {/* MY BOOKINGS */}
        <Route
          path="/my-booking"
          element={
            <ProtectedRoute>
              <MyBooking />
            </ProtectedRoute>
          }
        />


        {/* FAVORITES */}
        <Route
          path="/favorite"
          element={
            <ProtectedRoute>
              <Favorite />
            </ProtectedRoute>
          }
        />


        {/* LOGIN */}
        <Route
          path="/login"
          element={<Login />}
        />


        {/* SIGNUP */}
        <Route
          path="/signup"
          element={<Signup />}
        />


        {/* MOVIE CENTERS */}
        <Route
          path="/movie-center"
          element={<MovieCenter />}
        />


        {/* ==================================================
            ADMIN ROUTES
        ================================================== */}

        <Route
          path="/admin/*"
          element={
            user ? (
              <Layout />
            ) : (
              <div className="min-h-screen flex items-center justify-center text-white">
                <p>
                  Please login to access the admin dashboard.
                </p>
              </div>
            )
          }
        >

          <Route
            index
            element={<Dashboard />}
          />

          <Route
            path="add-shows"
            element={<AddShows />}
          />

          <Route
            path="list-shows"
            element={<ListShows />}
          />

          <Route
            path="list-bookings"
            element={<ListBookings />}
          />

        </Route>

      </Routes>


      {/* ==================================================
          FOOTER
      ================================================== */}

      {!isAdminRoute && <Footer />}
    </>
  );
};

export default App;