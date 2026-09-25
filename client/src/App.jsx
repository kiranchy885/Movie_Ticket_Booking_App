import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Profile from "./pages/Profile";
import AdminProfile from "./pages/admin/adminProfile";
import VerifyEmail from "./pages/VerifyEmail";
import VerifyOtp from "./pages/VerifyOtp";
import ForgotPassword from "./pages/ForgotPassword";
import Theaters from "./pages/Theaters";
import AddMovie from "./pages/admin/AddMovie.jsx";   

// USER PAGES

import Home from "./pages/Home";
import Movies from "./pages/Movies";
import MovieDetail from "./pages/MovieDetail";
import SeatLayout from "./pages/SeatLayout";
import MyBooking from "./pages/MyBooking";
import Favorite from "./pages/Favorite";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

import {
    Routes,
    Route,
    useLocation,
    Navigate,
} from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";

// IMPORT TOASTER

import { Toaster } from "react-hot-toast";

// ADMIN PAGES

import Dashboard from "./pages/admin/Dashboard";
import AddShows from "./pages/admin/AddShows";
import ListBookings from "./pages/admin/ListBookings";
import ListShows from "./pages/admin/ListShows";
import Layout from "./pages/admin/Layout";
import AdminLogin from "./pages/admin/AdminLogin";
import ResultAnalysis from "./pages/admin/ResultAnalysis";
import Releases from "./pages/Releases.jsx";
import { useAuth } from "./context/AuthContext";
import { RefreshProvider } from "./context/RefreshContext";   // <-- ✅ Already imported

// APP

const App = () => {

    const { pathname } = useLocation();

    
    // CHECK ADMIN ROUTE

    const isAdminRoute =
        pathname.startsWith("/admin");

    // AUTH DATA

    const {
        user,
        admin,
        loading,
    } = useAuth();

    // ADMIN CHECK

    const isAdmin =
        admin?.role === "admin";

    // WAIT FOR AUTH

    if (loading) {

        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">

                <p className="text-gray-400">
                    Loading...
                </p>

            </div>
        );
    }

    
    // PAGE

    return (
        <div className="min-h-screen flex flex-col">
            {/*  */}
            {/* TOASTER */}
            {/*  */}

            <Toaster
                position="top-center"
                reverseOrder={false}
                toastOptions={{
                    duration: 3000,
                    style: {
                        background: "#363636",
                        color: "#fff",
                        border: "1px solid #444",
                        padding: "16px",
                        borderRadius: "8px",
                    },
                    success: {
                        duration: 3000,
                        iconTheme: {
                            primary: "#4ade80",
                            secondary: "#fff",
                        },
                    },
                    error: {
                        duration: 4000,
                        iconTheme: {
                            primary: "#ef4444",
                            secondary: "#fff",
                        },
                    },
                }}
            />

            {/*  */}
            {/* NAVBAR */}
            {/*  */}

            {!isAdminRoute && <Navbar />}

            {/*  */}
            {/* ROUTES – wrapped with RefreshProvider & flex-grow ✅ */}
            {/*  */}

            <div className="flex-grow">
                <RefreshProvider>
                    <Routes>

                        {/*  */}
                        {/* HOME */}
                        {/*  */}
                        <Route path="/verify-otp" element={<VerifyOtp />} />

                        {/* ✅ Forgot Password (OTP based) */}
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route
                            path="/"
                            element={<Home />}
                        />

                        <Route
                            path="/home"
                            element={<Home />}
                        />

                        {/*  */}
                        {/* ADMIN PROFILE */}
                        {/*  */}

                        <Route
                            path="/admin/profile"
                            element={<AdminProfile />}
                        />

                        {/*  */}
                        {/* MOVIES */}
                        {/*  */}

                        <Route
                            path="/movies"
                            element={<Movies />}
                        />

                        <Route
                            path="/movies/:id"
                            element={<MovieDetail />}
                        />

                        {/*  */}
                        {/* SEAT LAYOUT */}
                        {/*  */}

                        <Route
                            path="/movies/:id/:date"
                            element={<SeatLayout />}
                        />

                        {/*  */}
                        {/* MY BOOKINGS */}
                        {/*  */}

                        <Route
                            path="/my-booking"
                            element={<MyBooking />}
                        />

                        {/*  */}
                        {/* FAVORITES */}
                        {/*  */}
                        <Route path="/theaters" element={<Theaters />} />
                        <Route path="/releases" element={<Releases />} />
                        <Route
                            path="/favorite"
                            element={
                                <Favorite />
                            }
                        />

                        {/*  */}
                        {/* PROFILE */}
                        {/*  */}

                        <Route
                            path="/profile"
                            element={
                               
                                    <Profile />
                                
                            }
                        />

                        {/*  */}
                        {/* LOGIN */}
                        {/*  */}

                        <Route
                            path="/login"
                            element={<Login />}
                        />

                        {/*  */}
                        {/* SIGNUP */}
                        {/*  */}

                        <Route
                            path="/signup"
                            element={<Signup />}
                        />

                        {/*  */}
                        {/* EMAIL VERIFICATION – ✅ placed here, outside admin */}
                        {/*  */}

                        <Route
                            path="/verify/:token"
                            element={<VerifyEmail />}
                        />

                        {/*  */}
                        {/* ADMIN LOGIN */}
                        {/*  */}

                        <Route
                            path="/admin/login"
                            element={<AdminLogin />}
                        />

                        {/*  */}
                        {/* ADMIN ROUTES (nested) */}
                        {/*  */}

                        <Route
                            path="/admin/*"
                            element={
                                isAdmin ? (
                                    <Layout />
                                ) : (
                                    <Navigate
                                        to="/admin/login"
                                        replace
                                    />
                                )
                            }
                        >

                            {/*  */}
                            {/* ADMIN DASHBOARD */}
                            {/*  */}

                            <Route
                                index
                                element={<Dashboard />}
                            />
                            <Route path="add-movie" element={<AddMovie />} />  



                            {/*  */}
                            {/* ADD SHOWS */}
                            {/*  */}

                            <Route
                                path="add-shows"
                                element={<AddShows />}
                            />

                            {/*  */}
                            {/* LIST SHOWS */}
                            {/*  */}

                            <Route
                                path="list-shows"
                                element={<ListShows />}
                            />

                            {/*  */}
                            {/* LIST BOOKINGS */}
                            {/*  */}

                            <Route
                                path="list-bookings"
                                element={<ListBookings />}
                            />

                            {/*  */}
                            {/* RESULT ANALYSIS */}
                            {/*  */}

                            <Route
                                path="result-analysis"
                                element={<ResultAnalysis />}
                            />

                        </Route>

                    </Routes>
                </RefreshProvider>
            </div>

            {/*  */}
            {/* FOOTER & DISTINGUISHING SEPARATOR LINE */}
            {/*  */}

            {!isAdminRoute && (
                <>
                    <div className="w-full border-t border-gray-800"></div>
                    <Footer />
                </>
            )}

        </div>
    );
};

export default App;