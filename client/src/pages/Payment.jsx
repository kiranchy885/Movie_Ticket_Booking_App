import React, {
    useEffect,
    useState,
} from "react";

import {
    useNavigate,
    useParams,
} from "react-router-dom";

import axios from "axios";
import { toast } from "react-toastify";

import {
    CreditCard,
    ArrowLeft,
    CheckCircle,
} from "lucide-react";

import {
    useAppContext,
} from "../context/AppContext";

const Payment = () => {
    const {
        getToken,
        user,
    } = useAppContext();

    const {
        bookingId,
    } = useParams();

    const navigate =
        useNavigate();

    const [
        booking,
        setBooking,
    ] = useState(null);

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        paying,
        setPaying,
    ] = useState(false);

    const [
        cardNumber,
        setCardNumber,
    ] = useState("");

    const [
        expiryDate,
        setExpiryDate,
    ] = useState("");

    const [
        cvv,
        setCvv,
    ] = useState("");

    // =====================================================
    // GET BOOKING
    // =====================================================

    const getBooking =
        async () => {
            try {
                setLoading(true);

                const token =
                    await getToken();

                if (!token) {
                    toast.error(
                        "Please login again."
                    );
                    navigate("/login");
                    return;
                }

                const response =
                    await axios.get(
                        `http://localhost:5000/api/booking/${bookingId}`,
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${token}`,
                            },
                        }
                    );

                if (
                    response.data.success
                ) {
                    setBooking(
                        response.data.booking
                    );
                } else {
                    toast.error(
                        response.data.message ||
                        "Booking not found."
                    );
                }

            } catch (error) {
                console.error(
                    "Get booking error:",
                    error.response?.data ||
                    error.message
                );

                toast.error(
                    error.response?.data?.message ||
                    "Unable to load booking."
                );

            } finally {
                setLoading(false);
            }
        };

    useEffect(() => {
        if (bookingId) {
            getBooking();
        }
    }, [bookingId]);

    // =====================================================
    // FORMAT CARD NUMBER
    // =====================================================

    const handleCardNumber =
        (e) => {
            let value =
                e.target.value
                    .replace(/\D/g, "");

            value =
                value.substring(
                    0,
                    16
                );

            setCardNumber(value);
        };

    // =====================================================
    // PAYMENT
    // =====================================================

    const handlePayment =
        async (e) => {
            e.preventDefault();

            if (!user) {
                toast.warning(
                    "Please login first."
                );
                return;
            }

            if (
                cardNumber.length !==
                16
            ) {
                toast.error(
                    "Card number must contain 16 digits."
                );
                return;
            }

            if (
                !expiryDate
            ) {
                toast.error(
                    "Enter expiry date."
                );
                return;
            }

            if (
                cvv.length !== 3
            ) {
                toast.error(
                    "CVV must contain 3 digits."
                );
                return;
            }

            try {
                setPaying(true);

                const token =
                    await getToken();

                const response =
                    await axios.post(
                        "http://localhost:5000/api/booking/payment",
                        {
                            bookingId,
                            cardNumber,
                            expiryDate,
                            cvv,
                        },
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${token}`,
                                "Content-Type":
                                    "application/json",
                            },
                        }
                    );

                if (
                    response.data.success
                ) {
                    toast.success(
                        "Payment successful!"
                    );

                    navigate(
                        `/payment-result/${bookingId}`
                    );
                } else {
                    toast.error(
                        response.data.message ||
                        "Payment failed."
                    );
                }

            } catch (error) {
                console.error(
                    "Payment error:",
                    error.response?.data ||
                    error.message
                );

                toast.error(
                    error.response?.data?.message ||
                    "Payment failed."
                );

            } finally {
                setPaying(false);
            }
        };

    // =====================================================
    // LOADING
    // =====================================================

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-white">
                <p>
                    Loading payment...
                </p>
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-white gap-4">
                <p className="text-xl">
                    Booking not found.
                </p>

                <button
                    onClick={() =>
                        navigate(-1)
                    }
                    className="bg-primary px-6 py-2 rounded-full"
                >
                    Go Back
                </button>
            </div>
        );
    }

    const movie =
        booking.show?.movie;

    return (
        <div className="min-h-screen px-6 md:px-16 lg:px-40 pt-32 pb-20 text-white">

            <div className="max-w-5xl mx-auto">

                {/* ================================================= */}
                {/* TITLE */}
                {/* ================================================= */}

                <div className="flex items-center gap-3 mb-8">

                    <CreditCard
                        className="w-8 h-8 text-primary"
                    />

                    <h1 className="text-3xl font-bold">
                        Payment
                    </h1>

                </div>

                <div className="grid md:grid-cols-2 gap-8">

                    {/* ================================================= */}
                    {/* BOOKING SUMMARY */}
                    {/* ================================================= */}

                    <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6">

                        <h2 className="text-xl font-semibold mb-5">
                            Booking Summary
                        </h2>

                        {movie?.poster_path && (
                            <img
                                src={movie.poster_path}
                                alt={movie.title}
                                className="w-full h-64 object-cover rounded-xl mb-5"
                            />
                        )}

                        <h3 className="text-2xl font-bold">
                            {movie?.title ||
                                "Movie"}
                        </h3>

                        <div className="mt-4 space-y-3 text-gray-300">

                            <p>
                                <span className="text-gray-500">
                                    Seats:
                                </span>{" "}
                                {booking.bookedSeats?.join(
                                    ", "
                                )}
                            </p>

                            <p>
                                <span className="text-gray-500">
                                    Number of seats:
                                </span>{" "}
                                {booking.bookedSeats?.length}
                            </p>

                            <p>
                                <span className="text-gray-500">
                                    Booking status:
                                </span>{" "}
                                {booking.bookingStatus}
                            </p>

                        </div>

                        <div className="border-t border-gray-700 mt-6 pt-5 flex justify-between">

                            <span className="text-lg">
                                Total Amount
                            </span>

                            <span className="text-2xl font-bold text-primary">
                                Rs.{" "}
                                {booking.amount}
                            </span>

                        </div>

                    </div>

                    {/* ================================================= */}
                    {/* PAYMENT FORM */}
                    {/* ================================================= */}

                    <form
                        onSubmit={
                            handlePayment
                        }
                        className="bg-primary/10 border border-primary/20 rounded-2xl p-6"
                    >

                        <h2 className="text-xl font-semibold mb-6">
                            Demo Payment
                        </h2>

                        <p className="text-sm text-gray-400 mb-6">
                            This is a demo payment system.
                            No real money will be charged.
                        </p>

                        {/* CARD */}

                        <div className="mb-5">

                            <label className="block text-sm mb-2">
                                Card Number
                            </label>

                            <input
                                type="text"
                                value={
                                    cardNumber
                                }
                                onChange={
                                    handleCardNumber
                                }
                                placeholder="1234567812345678"
                                className="w-full bg-black/30 border border-gray-700 rounded-lg px-4 py-3 outline-none focus:border-primary"
                            />

                        </div>

                        {/* EXPIRY + CVV */}

                        <div className="grid grid-cols-2 gap-4 mb-6">

                            <div>

                                <label className="block text-sm mb-2">
                                    Expiry Date
                                </label>

                                <input
                                    type="text"
                                    value={
                                        expiryDate
                                    }
                                    onChange={(
                                        e
                                    ) =>
                                        setExpiryDate(
                                            e.target.value
                                        )
                                    }
                                    placeholder="12/30"
                                    className="w-full bg-black/30 border border-gray-700 rounded-lg px-4 py-3 outline-none focus:border-primary"
                                />

                            </div>

                            <div>

                                <label className="block text-sm mb-2">
                                    CVV
                                </label>

                                <input
                                    type="password"
                                    maxLength={3}
                                    value={cvv}
                                    onChange={(
                                        e
                                    ) =>
                                        setCvv(
                                            e.target.value.replace(
                                                /\D/g,
                                                ""
                                            )
                                        )
                                    }
                                    placeholder="123"
                                    className="w-full bg-black/30 border border-gray-700 rounded-lg px-4 py-3 outline-none focus:border-primary"
                                />

                            </div>

                        </div>

                        {/* PAY */}

                        <button
                            type="submit"
                            disabled={
                                paying
                            }
                            className="w-full bg-primary hover:bg-primary-dull py-3 rounded-full font-semibold transition disabled:bg-gray-600 disabled:cursor-not-allowed"
                        >
                            {paying
                                ? "Processing Payment..."
                                : `Pay Rs. ${booking.amount}`}
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                navigate(-1)
                            }
                            className="w-full mt-3 border border-gray-700 py-3 rounded-full flex items-center justify-center gap-2 hover:bg-white/5"
                        >
                            <ArrowLeft className="w-4 h-4" />

                            Back
                        </button>

                    </form>

                </div>
            </div>
        </div>
    );
};

export default Payment;