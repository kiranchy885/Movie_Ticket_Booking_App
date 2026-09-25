import React, {
    useEffect,
    useState,
    useCallback,
    useRef,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import { loadStripe } from "@stripe/stripe-js";
import {
    Elements,
    CardElement,
    useStripe,
    useElements,
} from "@stripe/react-stripe-js";

import BlurCircle from "../components/BlurCircle";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Loading from "../components/Loading";
import { useAuth } from "../context/AuthContext";
import { useAutoRefresh } from "../context/RefreshContext";

import { MapPin, Ticket } from "lucide-react";

// STRIPE
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// PRICING MODEL (fallback only)
const SEAT_TYPE_PERCENTAGES = {
    STANDARD: 120,
    PREMIUM: 115,
    REGULAR: 100,
};

const SEAT_TYPES_ORDER = ["STANDARD", "PREMIUM", "REGULAR"];

const SEAT_TYPE_CONFIG = {
    STANDARD: {
        label: "STANDARD",
        dot: "bg-sky-500",
        text: "text-sky-300",
    },
    PREMIUM: {
        label: "PREMIUM",
        dot: "bg-amber-400",
        text: "text-amber-300",
    },
    REGULAR: {
        label: "REGULAR",
        dot: "bg-emerald-500",
        text: "text-emerald-300",
    },
};

// FALLBACK HELPERS
const FRONT_ROWS  = ["A", "B", "C", "D"];
const MIDDLE_ROWS = ["E", "F", "G", "H"];
const BACK_ROWS   = ["I", "J"];

const getSeatTypeByRow = (seat) => {
    const row = String(seat).charAt(0).toUpperCase();
    if (BACK_ROWS.includes(row))   return "PREMIUM";
    if (MIDDLE_ROWS.includes(row)) return "REGULAR";
    return "STANDARD";
};

const extractBasePrice = (source) => {
    if (!source) return null;
    const candidates = [
        source.showPrice,
        source.basePrice,
        source.price,
        source.ticketPrice,
        source.seatPrices?.standard,
    ];
    for (const c of candidates) {
        const v = Number(c);
        if (Number.isFinite(v) && v > 0) return v;
    }
    return null;
};

// BREAKDOWN BUILDER
const getBookingSeatBreakdown = (booking) => {
    if (!booking) return null;

    // Path A: seatDetails present
    if (
        Array.isArray(booking.seatDetails) &&
        booking.seatDetails.length > 0
    ) {
        const groups = { STANDARD: [], PREMIUM: [], REGULAR: [] };

        booking.seatDetails.forEach((entry) => {
            const type = ["STANDARD", "PREMIUM", "REGULAR"].includes(
                entry.type
            )
                ? entry.type
                : getSeatTypeByRow(entry.seat);
            groups[type].push({
                seat: entry.seat,
                price: Number(entry.price) || 0,
                percentage: Number(entry.percentage) || 100,
            });
        });

        const basePrice =
            Number(booking.basePrice) ||
            extractBasePrice(booking.show) ||
            null;

        const entries = SEAT_TYPES_ORDER.map((type) => {
            const seats = groups[type];
            if (seats.length === 0) return null;

            const unitPrice = seats[0].price;
            const percentage = seats[0].percentage;
            const subtotal = seats.reduce((s, x) => s + x.price, 0);

            return {
                type,
                seats: seats.map((s) => s.seat),
                count: seats.length,
                unitPrice,
                percentage,
                subtotal,
            };
        }).filter(Boolean);

        const computedTotal = entries.reduce((s, e) => s + e.subtotal, 0);

        return { basePrice, entries, computedTotal };
    }

    // Path B: client fallback
    if (!booking.bookedSeats?.length) return null;

    const basePrice =
        extractBasePrice(booking.show) || extractBasePrice(booking);
    if (!basePrice) return null;

    const groups = { STANDARD: [], PREMIUM: [], REGULAR: [] };
    booking.bookedSeats.forEach((seat) => {
        groups[getSeatTypeByRow(seat)].push(seat);
    });

    const entries = SEAT_TYPES_ORDER.map((type) => {
        const seats = groups[type];
        const unitPrice = Math.round(
            (basePrice * SEAT_TYPE_PERCENTAGES[type]) / 100
        );
        return {
            type,
            seats,
            count: seats.length,
            unitPrice,
            percentage: SEAT_TYPE_PERCENTAGES[type],
            subtotal: unitPrice * seats.length,
        };
    }).filter((e) => e.count > 0);

    const computedTotal = entries.reduce((s, e) => s + e.subtotal, 0);
    return { basePrice, entries, computedTotal };
};

// STRIPE PAYMENT FORM
const StripePaymentForm = ({ bookingId, onSuccess, onCancel }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    const [stripeReady, setStripeReady] = useState(false);

    useEffect(() => {
        if (stripe && elements) setStripeReady(true);
    }, [stripe, elements]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!stripe || !elements) {
            toast.error("Stripe is not ready. Please try again.");
            return;
        }
        setLoading(true);

        try {
            const rawToken =
                localStorage.getItem("userToken") ||
                localStorage.getItem("token");
            if (!rawToken) {
                toast.error("Please log in to proceed.");
                setLoading(false);
                return;
            }
            const cleanToken = rawToken
                .replace(/^"(.*)"$/, "$1")
                .replace(/^Bearer\s+/i, "")
                .trim();

            const response = await axios.post(
                `http://localhost:5000/booking/stripe/create-payment-intent/${bookingId}`,
                {},
                { headers: { Authorization: `Bearer ${cleanToken}` } }
            );

            if (!response.data?.success) {
                toast.error(
                    response.data?.message || "Failed to initialize payment."
                );
                setLoading(false);
                return;
            }

            const { clientSecret } = response.data;
            const cardElement = elements.getElement(CardElement);
            if (!cardElement) {
                toast.error("Card element not found. Please refresh and try again.");
                setLoading(false);
                return;
            }

            const { error, paymentIntent } = await stripe.confirmCardPayment(
                clientSecret,
                {
                    payment_method: {
                        card: cardElement,
                        billing_details: {},
                    },
                }
            );

            if (error) {
                toast.error(error.message);
                setLoading(false);
                return;
            }

            if (paymentIntent.status === "succeeded") {
                const verifyResponse = await axios.post(
                    "http://localhost:5000/booking/stripe/verify-payment-intent",
                    { paymentIntentId: paymentIntent.id, bookingId },
                    { headers: { Authorization: `Bearer ${cleanToken}` } }
                );

                if (verifyResponse.data?.success) {
                    toast.success("Payment successful!");
                    onSuccess();
                } else {
                    toast.error(
                        verifyResponse.data?.message || "Payment verification failed."
                    );
                }
            } else {
                toast.error(
                    "Payment not completed. Status: " + paymentIntent.status
                );
            }
        } catch (err) {
            console.error("Payment error:", err);
            toast.error(err?.response?.data?.message || "Payment failed.");
        } finally {
            setLoading(false);
        }
    };

    if (!stripeReady) {
        return (
            <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-400">Loading Stripe...</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                <CardElement
                    options={{
                        style: {
                            base: {
                                color: "#fff",
                                fontSize: "16px",
                                fontFamily:
                                    "system-ui, -apple-system, sans-serif",
                                "::placeholder": { color: "#aab7c4" },
                                padding: "10px",
                            },
                            invalid: { color: "#fa755a" },
                        },
                        hidePostalCode: true,
                    }}
                />
            </div>
            <div className="flex gap-3">
                <button
                    type="submit"
                    disabled={!stripe || loading}
                    className="flex-1 bg-primary hover:bg-primary/80 disabled:opacity-50 py-2 rounded-lg font-semibold transition"
                >
                    {loading ? "Processing..." : "Pay Now"}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                >
                    Cancel
                </button>
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">
                Secured by Stripe. Your card details are not stored.
            </p>
        </form>
    );
};

// HELPERS
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
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
};

const resolveTheaterFromBooking = (booking) => {
    if (!booking) return null;
    const show = booking.show;

    if (show?.theaterId && typeof show.theaterId === "object") {
        return {
            name: show.theaterId.name || "",
            city: show.theaterId.city || "",
            address: show.theaterId.address || "",
        };
    }
    if (show?.theaterName) {
        return {
            name: show.theaterName,
            city: show.theaterCity || "",
            address: show.theaterAddress || "",
        };
    }
    if (booking.theaterName) {
        return {
            name: booking.theaterName,
            city: booking.theaterCity || "",
            address: booking.theaterAddress || "",
        };
    }
    if (booking.theater && typeof booking.theater === "object") {
        return {
            name: booking.theater.name || "",
            city: booking.theater.city || "",
            address: booking.theater.address || "",
        };
    }
    if (booking.theaterId && typeof booking.theaterId === "object") {
        return {
            name: booking.theaterId.name || "",
            city: booking.theaterId.city || "",
            address: booking.theaterId.address || "",
        };
    }
    return null;
};

// BREAKDOWN PANEL
const SeatBreakdownPanel = ({ booking, breakdown }) => {
    if (!breakdown) {
        return (
            <div className="mt-3 text-sm text-gray-400">
                <span>Total Seats: {booking.bookedSeats?.length || 0}</span>
                <span className="ml-4">
                    Seats: {booking.bookedSeats?.join(", ") || "None"}
                </span>
            </div>
        );
    }

    const { basePrice, entries } = breakdown;

    return (
        <div className="mt-3">
            <div className="text-sm text-gray-400">
                <span>Total Seats: {booking.bookedSeats?.length || 0}</span>
                <span className="ml-4">
                    Seats: {booking.bookedSeats?.join(", ") || "None"}
                </span>
            </div>

            <div className="mt-3 rounded-lg border border-gray-800 bg-black/30 px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">
                    Cost Breakdown
                    {basePrice ? ` · Show price Rs. ${basePrice}` : ""}
                </p>

                <div className="space-y-1.5">
                    {entries.map((entry) => {
                        const config = SEAT_TYPE_CONFIG[entry.type];
                        const diff = (entry.percentage || 100) - 100;
                        const diffLabel = diff === 0 ? "base" : `+${diff}%`;

                        return (
                            <div
                                key={entry.type}
                                className="flex items-center justify-between text-xs"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <span
                                        className={`w-2 h-2 rounded-full flex-shrink-0 ${config.dot}`}
                                    />
                                    <span className={`font-semibold ${config.text}`}>
                                        {config.label}
                                    </span>
                                    <span className="text-gray-500">
                                        ({diffLabel})
                                    </span>
                                    <span className="text-gray-500 truncate">
                                        Rs. {entry.unitPrice} × {entry.count}
                                    </span>
                                </div>
                                <span className="text-white font-medium ml-3">
                                    Rs. {entry.subtotal}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// AUTO-REFRESH INTERVAL (matches the 2–3 s requirement)
const POLL_INTERVAL_MS = 2500;


// MAIN COMPONENT
const MyBooking = () => {
    const navigate = useNavigate();
    const { isLoggedIn, user, userToken } = useAuth();
    const [searchParams] = useSearchParams();

    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [selectedBookingId, setSelectedBookingId] = useState(null);

    // Guards against firing the price-sync twice per booking per session
    const syncedRef = useRef(new Set());

    // Silent background fetch (no loading flicker)
    const backgroundRef = useRef(false);

    // SYNC A SINGLE BOOKING'S PRICE TO DB
    const syncBookingToDatabase = useCallback(
        async (booking, breakdown) => {
            if (!breakdown || !breakdown.entries?.length) return;
            if (syncedRef.current.has(booking._id)) return;

            const computedAmount = breakdown.computedTotal;
            const storedAmount = Number(booking.amount) || 0;

            if (Math.abs(storedAmount - computedAmount) <= 1) return;

            syncedRef.current.add(booking._id);

            try {
                const rawToken =
                    localStorage.getItem("userToken") ||
                    localStorage.getItem("token");
                if (!rawToken) return;

                const cleanToken = rawToken
                    .replace(/^"(.*)"$/, "$1")
                    .replace(/^Bearer\s+/i, "")
                    .trim();

                const seatDetails = [];
                breakdown.entries.forEach((entry) => {
                    entry.seats.forEach((seat) => {
                        seatDetails.push({
                            seat,
                            type: entry.type,
                            price: entry.unitPrice,
                            percentage: entry.percentage,
                        });
                    });
                });

                const response = await axios.put(
                    `http://localhost:5000/booking/${booking._id}/sync-price`,
                    {
                        amount: computedAmount,
                        basePrice: breakdown.basePrice,
                        seatDetails,
                    },
                    { headers: { Authorization: `Bearer ${cleanToken}` } }
                );

                if (response.data?.success) {
                    console.log(
                        `💰 DB updated for booking ${booking._id}: Rs. ${computedAmount}`
                    );
                    setBookings((prev) =>
                        prev.map((b) =>
                            b._id === booking._id
                                ? {
                                      ...b,
                                      amount: computedAmount,
                                      basePrice: breakdown.basePrice,
                                      seatDetails,
                                  }
                                : b
                        )
                    );
                }
            } catch (err) {
                console.warn(
                    `Could not sync booking ${booking._id}:`,
                    err?.response?.data?.message || err?.message
                );
            }
        },
        []
    );

    // FETCH BOOKINGS
    const fetchBookings = useCallback(async () => {
        try {
            // First load: show Loading spinner.
            // Background polls: do NOT toggle loading.
            if (!backgroundRef.current) {
                setLoading(true);
            }

            const rawToken =
                localStorage.getItem("userToken") ||
                localStorage.getItem("token");
            if (!rawToken) {
                setBookings([]);
                setLoading(false);
                return;
            }

            const cleanToken = rawToken
                .replace(/^"(.*)"$/, "$1")
                .replace(/^Bearer\s+/i, "")
                .trim();

            const response = await axios.get(
                "http://localhost:5000/booking/my",
                { headers: { Authorization: `Bearer ${cleanToken}` } }
            );

            if (response.data?.success) {
                const fetched = response.data.bookings || [];
                console.log("My bookings from API:", fetched);
                setBookings(fetched);

                // Sync any booking whose stored amount doesn't match
                fetched.forEach((b) => {
                    const breakdown = getBookingSeatBreakdown(b);
                    if (breakdown) syncBookingToDatabase(b, breakdown);
                });

                // Notify any listener (Navbar badge, other pages, etc.)
                window.dispatchEvent(new Event("bookingsUpdated"));
            } else {
                setBookings([]);
            }
        } catch (error) {
            console.error("Fetch bookings error:", error);
            // Don't wipe the UI on background poll failures
            if (!backgroundRef.current) setBookings([]);
        } finally {
            setLoading(false);
            backgroundRef.current = false;
        }
    }, [syncBookingToDatabase]);

    // AUTO-REFRESH HOOK (global refresh() call support)
    useAutoRefresh(fetchBookings, [fetchBookings]);

    // EVENT LISTENER — external bookingsUpdated signals
    useEffect(() => {
        const handleUpdate = () => {
            console.log("🔄 MyBooking received bookingsUpdated event");
            fetchBookings();
        };

        window.addEventListener("bookingsUpdated", handleUpdate);
        return () =>
            window.removeEventListener("bookingsUpdated", handleUpdate);
    }, [fetchBookings]);

    // 2.5 s POLLING SAFETY NET
   
    useEffect(() => {
        if (!user) return;

        const interval = setInterval(() => {
            if (document.visibilityState !== "visible") return;
            backgroundRef.current = true;
            fetchBookings();
        }, POLL_INTERVAL_MS);

        return () => clearInterval(interval);
    }, [user, fetchBookings]);

    // SIDEBAR HANDLERS
    const handleOpenSidebar = (bookingId) => {
        setSelectedBookingId(bookingId);
        setSidebarOpen(true);
    };

    const handleCloseSidebar = () => {
        setSidebarOpen(false);
        setSelectedBookingId(null);
    };

    const handlePaymentSuccess = () => {
        toast.success("Payment successful! Your booking is confirmed.");
        handleCloseSidebar();
        fetchBookings();
    };
  // STRIPE REDIRECT VERIFICATION
    useEffect(() => {
        const payment = searchParams.get("payment");
        const sessionId = searchParams.get("session_id");

        if (payment === "success" && sessionId) {
            const verifyPayment = async () => {
                try {
                    const rawToken =
                        localStorage.getItem("userToken") ||
                        localStorage.getItem("token");
                    if (!rawToken) {
                        toast.error("Please log in to verify payment.");
                        return;
                    }
                    const cleanToken = rawToken
                        .replace(/^"(.*)"$/, "$1")
                        .replace(/^Bearer\s+/i, "")
                        .trim();

                    const response = await axios.post(
                        "http://localhost:5000/booking/stripe/verify",
                        { sessionId },
                        { headers: { Authorization: `Bearer ${cleanToken}` } }
                    );

                    if (response.data?.success) {
                        toast.success("Payment successful!");
                        await fetchBookings();
                        navigate("/my-booking", { replace: true });
                    } else {
                        toast.error(
                            response.data?.message || "Payment verification failed."
                        );
                    }
                } catch (error) {
                    console.error("Stripe verify error:", error);
                    toast.error(
                        error?.response?.data?.message ||
                            "Payment verification failed."
                    );
                }
            };
            verifyPayment();
        } else if (payment === "cancelled") {
            toast.error("Payment was cancelled.");
            navigate("/my-booking", { replace: true });
        }
    }, [searchParams, fetchBookings, navigate]);

    // LOAD ON MOUNT
    useEffect(() => {
        if (!isLoggedIn()) {
            navigate("/login");
            return;
        }
        fetchBookings();
        // eslint-disable-next-line
    }, []);

    // RENDER
    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col">
                <Navbar />
                <main className="flex-1 flex items-center justify-center">
                    <Loading />
                </main>
               
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            <Navbar />
            <main className="flex-1 relative overflow-hidden px-4 py-10 md:px-16 lg:px-40">
                <BlurCircle top="150px" left="0px" />
                <BlurCircle bottom="50px" right="50px" />

                {/* HEADER */}
                <div className="flex items-end justify-between mb-8 pt-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white">
                            My <span className="text-primary">Bookings</span>
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">
                            {bookings.length}{" "}
                            {bookings.length === 1 ? "booking" : "bookings"}{" "}
                            • auto-syncing
                        </p>
                    </div>
                </div>

                {bookings.length === 0 ? (
                    <div className="border border-primary/25 bg-primary/10 rounded-lg p-10 text-center">
                        <Ticket className="w-10 h-10 mx-auto text-primary/70 mb-4" />
                        <h2 className="text-xl font-semibold">No bookings yet</h2>
                        <p className="text-gray-400 mt-3">
                            You haven't made any movie bookings yet.
                        </p>
                        <p className="text-gray-500 text-sm mt-2">
                            Your bookings will appear here after you book a movie.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6 max-w-4xl">
                        {bookings.map((booking) => {
                            const theater = resolveTheaterFromBooking(booking);
                            const breakdown = getBookingSeatBreakdown(booking);

                            const displayTotal = breakdown
                                ? breakdown.computedTotal
                                : Number(booking.amount) || 0;

                            return (
                                <div
                                    key={booking._id}
                                    className="bg-gray-900/50 border border-gray-700 rounded-xl p-4 flex flex-col md:flex-row gap-6 hover:border-primary/30 transition"
                                >
                                    <div className="flex-shrink-0">
                                        {booking.poster ? (
                                            <img
                                                src={booking.poster}
                                                alt={booking.movieName || "Movie"}
                                                className="w-28 h-40 object-cover rounded-lg"
                                            />
                                        ) : (
                                            <div className="w-28 h-40 bg-gray-800 rounded-lg flex items-center justify-center text-gray-500 text-sm">
                                                No Poster
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 flex flex-col justify-between">
                                        <div>
                                            <h2 className="text-xl font-semibold">
                                                {booking.movieName || "Unknown Movie"}
                                            </h2>

                                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mt-1">
                                                <span>{formatDuration(booking.runtime)}</span>
                                                <span>•</span>
                                                <span>{formatDate(booking.showDateTime)}</span>
                                            </div>

                                            {theater?.name && (
                                                <div className="flex items-start gap-1.5 mt-2 text-sm text-gray-300">
                                                    <MapPin
                                                        size={14}
                                                        className="text-primary flex-shrink-0 mt-0.5"
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="text-white font-medium truncate">
                                                            {theater.name}
                                                        </p>
                                                        {(theater.city || theater.address) && (
                                                            <p className="text-xs text-gray-400 truncate">
                                                                {theater.city && `${theater.city}, `}
                                                                {theater.address}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            <SeatBreakdownPanel
                                                booking={booking}
                                                breakdown={breakdown}
                                            />
                                        </div>

                                        <div className="flex flex-wrap items-center justify-between mt-4 pt-4 border-t border-gray-700">
                                            <div>
                                                <p className="text-xs text-gray-400">
                                                    Total Amount
                                                </p>
                                                <p className="text-2xl font-bold text-primary">
                                                    Rs. {displayTotal}
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
                                                            handleOpenSidebar(booking._id)
                                                        }
                                                        className="px-6 py-2 bg-primary hover:bg-primary/80 rounded-lg text-white font-semibold transition flex items-center gap-2"
                                                    >
                                                        Pay Now
                                                        <span className="text-xs">→</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
           

            {sidebarOpen && selectedBookingId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
                    <div className="bg-gray-900 w-full max-w-md p-6 overflow-y-auto h-full border-l border-gray-700 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Complete Payment</h2>
                            <button
                                onClick={handleCloseSidebar}
                                className="text-gray-400 hover:text-white text-2xl"
                            >
                                ×
                            </button>
                        </div>
                        <p className="text-gray-400 text-sm mb-6">
                            Enter your card details to pay for this booking.
                        </p>
                        <Elements stripe={stripePromise}>
                            <StripePaymentForm
                                bookingId={selectedBookingId}
                                onSuccess={handlePaymentSuccess}
                                onCancel={handleCloseSidebar}
                            />
                        </Elements>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyBooking;