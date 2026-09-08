import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";

import BlurCircle from "../components/BlurCircle";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Loading from "../components/Loading";
import { useAuth } from "../context/AuthContext";


// =====================================================
// HELPERS
// =====================================================

const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";

    const d = new Date(dateStr);

    if (isNaN(d)) return "Invalid Date";

    return d.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};


const formatDuration = (minutes) => {
    if (!minutes) return "N/A";

    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;

    return hrs > 0
        ? `${hrs}h ${mins}m`
        : `${mins}m`;
};


// =====================================================
// MAIN COMPONENT
// =====================================================

const MyBooking = () => {

    const navigate = useNavigate();

    const { isLoggedIn } = useAuth();

    const [searchParams] = useSearchParams();

    const [bookings, setBookings] = useState([]);

    const [loading, setLoading] = useState(true);

    const [paying, setPaying] = useState(null);


    // =====================================================
    // FETCH MY BOOKINGS
    // =====================================================

    const fetchBookings = async () => {

        try {

            setLoading(true);

            const token =
                localStorage.getItem("userToken") ||
                localStorage.getItem("token");


            if (!token) {

                toast.error(
                    "Please log in to view your bookings."
                );

                setBookings([]);

                return;
            }


            const response = await axios.get(
                "http://localhost:5000/booking/my",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );


            if (response.data?.success) {

                setBookings(
                    response.data.bookings || []
                );

            } else {

                toast.error(
                    response.data?.message ||
                    "Failed to load bookings."
                );

                setBookings([]);
            }


        } catch (error) {

            console.error(
                "Fetch bookings error:",
                error
            );

            toast.error(
                error?.response?.data?.message ||
                "Unable to fetch bookings."
            );

            setBookings([]);

        } finally {

            setLoading(false);
        }
    };


    // =====================================================
    // STRIPE PAYMENT
    // =====================================================

    const handlePayNow = async (bookingId) => {

        try {

            setPaying(bookingId);


            const token =
                localStorage.getItem("userToken") ||
                localStorage.getItem("token");


            if (!token) {

                toast.error(
                    "Please log in to proceed."
                );

                setPaying(null);

                return;
            }


            const response = await axios.post(

                `http://localhost:5000/booking/stripe/create-checkout-session/${bookingId}`,

                {},

                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );


            if (
                response.data?.success &&
                response.data?.payment_url
            ) {

                // Redirect to Stripe Checkout
                window.location.href =
                    response.data.payment_url;

            } else {

                toast.error(
                    response.data?.message ||
                    "Failed to initiate Stripe payment."
                );

                setPaying(null);
            }


        } catch (error) {

            console.error(
                "Stripe payment error:",
                error
            );

            toast.error(
                error?.response?.data?.message ||
                "Failed to initiate Stripe payment."
            );

            setPaying(null);
        }
    };


    // =====================================================
    // VERIFY STRIPE PAYMENT AFTER REDIRECT
    // =====================================================

    useEffect(() => {

        const payment =
            searchParams.get("payment");

        const sessionId =
            searchParams.get("session_id");


        // -------------------------------------------------
        // SUCCESS
        // -------------------------------------------------

        if (
            payment === "success" &&
            sessionId
        ) {

            const verifyPayment = async () => {

                try {

                    const token =
                        localStorage.getItem("userToken") ||
                        localStorage.getItem("token");


                    if (!token) {

                        toast.error(
                            "Please log in to verify payment."
                        );

                        return;
                    }


                    const response =
                        await axios.post(

                            "http://localhost:5000/booking/stripe/verify",

                            {
                                sessionId,
                            },

                            {
                                headers: {
                                    Authorization:
                                        `Bearer ${token}`,
                                },
                            }
                        );


                    if (
                        response.data?.success
                    ) {

                        toast.success(
                            "Payment successful!"
                        );

                        await fetchBookings();


                        // Remove payment query parameters
                        navigate(
                            "/my-booking",
                            {
                                replace: true,
                            }
                        );

                    } else {

                        toast.error(
                            response.data?.message ||
                            "Payment verification failed."
                        );
                    }


                } catch (error) {

                    console.error(
                        "Stripe verification error:",
                        error
                    );

                    toast.error(
                        error?.response?.data?.message ||
                        "Payment verification failed."
                    );
                }
            };


            verifyPayment();
        }


        // -------------------------------------------------
        // CANCELLED
        // -------------------------------------------------

        else if (
            payment === "cancelled"
        ) {

            toast.error(
                "Payment was cancelled."
            );


            navigate(
                "/my-booking",
                {
                    replace: true,
                }
            );
        }

    }, [searchParams]);


    // =====================================================
    // LOAD BOOKINGS
    // =====================================================

    useEffect(() => {

        if (!isLoggedIn()) {

            navigate("/login");

            return;
        }


        fetchBookings();

    }, []);


    // =====================================================
    // LOADING
    // =====================================================

    if (loading) {

        return (

            <div className="min-h-screen bg-black text-white flex flex-col">

                <Navbar />

                <main className="flex-1 flex items-center justify-center">

                    <Loading />

                </main>

                <Footer />

            </div>
        );
    }


    // =====================================================
    // RENDER
    // =====================================================

    return (

        <div className="min-h-screen bg-black text-white flex flex-col">

            <Navbar />


            <main className="flex-1 relative overflow-hidden px-4 py-10 md:px-16 lg:px-40">

                <BlurCircle
                    top="100px"
                    left="100px"
                />

                <BlurCircle
                    bottom="0px"
                    left="600px"
                />


                <h1 className="text-3xl font-bold mb-8">
                    My Bookings
                </h1>


                {bookings.length === 0 ? (

                    <div className="border border-primary/25 bg-primary/10 rounded-lg p-10 text-center">

                        <h2 className="text-xl font-semibold">
                            No bookings yet
                        </h2>

                        <p className="text-gray-400 mt-3">
                            You haven't made any movie
                            bookings yet.
                        </p>

                        <p className="text-gray-500 text-sm mt-2">
                            Your bookings will appear
                            here after you book a movie.
                        </p>

                    </div>

                ) : (

                    <div className="space-y-6 max-w-4xl">

                        {bookings.map((booking) => (

                            <div
                                key={booking._id}
                                className="bg-gray-900/50 border border-gray-700 rounded-xl p-4 flex flex-col md:flex-row gap-6 hover:border-primary/30 transition"
                            >

                                {/* POSTER */}

                                <div className="shrink-0">

                                    {booking.poster ? (

                                        <img
                                            src={booking.poster}
                                            alt={
                                                booking.movieName ||
                                                "Movie"
                                            }
                                            className="w-28 h-40 object-cover rounded-lg"
                                        />

                                    ) : (

                                        <div className="w-28 h-40 bg-gray-800 rounded-lg flex items-center justify-center text-gray-500 text-sm">
                                            No Poster
                                        </div>
                                    )}

                                </div>


                                {/* DETAILS */}

                                <div className="flex-1 flex flex-col justify-between">

                                    <div>

                                        <h2 className="text-xl font-semibold">

                                            {booking.movieName ||
                                                "Unknown Movie"}

                                        </h2>


                                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mt-1">

                                            <span>
                                                {formatDuration(
                                                    booking.runtime
                                                )}
                                            </span>

                                            <span>
                                                •
                                            </span>

                                            <span>
                                                {formatDate(
                                                    booking.showDateTime
                                                )}
                                            </span>

                                        </div>


                                        <div className="mt-3 text-sm text-gray-400">

                                            <span>
                                                Total Seats:{" "}
                                                {booking.bookedSeats
                                                    ?.length || 0}
                                            </span>

                                            <span className="ml-4">
                                                Seats:{" "}
                                                {booking.bookedSeats?.join(
                                                    ", "
                                                ) || "None"}
                                            </span>

                                        </div>

                                    </div>


                                    {/* PRICE & PAYMENT */}

                                    <div className="flex flex-wrap items-center justify-between mt-4 pt-4 border-t border-gray-700">

                                        <div>

                                            <p className="text-xs text-gray-400">
                                                Total Amount
                                            </p>

                                            <p className="text-2xl font-bold text-primary">

                                                Rs.{" "}
                                                {booking.amount || 0}

                                            </p>

                                        </div>


                                        <div>

                                            {booking.isPaid ? (

                                                <span className="px-4 py-2 bg-green-600/20 text-green-400 border border-green-600/30 rounded-lg text-sm font-medium">

                                                    Paid ✓

                                                </span>

                                            ) : (

                                                <button
                                                    onClick={() =>
                                                        handlePayNow(
                                                            booking._id
                                                        )
                                                    }
                                                    disabled={
                                                        paying ===
                                                        booking._id
                                                    }
                                                    className="px-6 py-2 bg-primary hover:bg-primary/80 disabled:opacity-50 rounded-lg text-white font-semibold transition flex items-center gap-2"
                                                >

                                                    {paying ===
                                                    booking._id ? (

                                                        "Redirecting to Stripe..."

                                                    ) : (

                                                        <>
                                                            Pay with Stripe

                                                            <span className="text-xs">
                                                                →
                                                            </span>
                                                        </>
                                                    )}

                                                </button>
                                            )}

                                        </div>

                                    </div>

                                </div>

                            </div>
                        ))}

                    </div>
                )}

            </main>


            <Footer />

        </div>
    );
};


export default MyBooking;