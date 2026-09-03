import React, {
    useEffect,
    useState,
} from "react";

import {
    useNavigate,
    useParams,
} from "react-router-dom";

import axios from "axios";

import {
    CheckCircle,
} from "lucide-react";

import {
    useAppContext,
} from "../context/AppContext";

const PaymentResult = () => {
    const {
        getToken,
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

    useEffect(() => {
        const getBooking =
            async () => {
                try {
                    const token =
                        await getToken();

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
                    }

                } catch (error) {
                    console.error(
                        error
                    );
                } finally {
                    setLoading(false);
                }
            };

        if (bookingId) {
            getBooking();
        }
    }, [bookingId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-white">
                Processing...
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-6 pt-20 text-white">

            <div className="max-w-lg w-full bg-primary/10 border border-primary/20 rounded-2xl p-8 text-center">

                <CheckCircle
                    className="w-20 h-20 text-green-500 mx-auto mb-5"
                />

                <h1 className="text-3xl font-bold mb-3">
                    Payment Successful!
                </h1>

                <p className="text-gray-400 mb-6">
                    Your movie ticket has been
                    successfully booked.
                </p>

                {booking && (
                    <div className="text-left bg-black/20 rounded-xl p-5 mb-6 space-y-3">

                        <p>
                            <span className="text-gray-400">
                                Movie:
                            </span>{" "}
                            {booking.show?.movie?.title}
                        </p>

                        <p>
                            <span className="text-gray-400">
                                Seats:
                            </span>{" "}
                            {booking.bookedSeats?.join(
                                ", "
                            )}
                        </p>

                        <p>
                            <span className="text-gray-400">
                                Amount:
                            </span>{" "}
                            Rs.{" "}
                            {booking.amount}
                        </p>

                        <p>
                            <span className="text-gray-400">
                                Transaction ID:
                            </span>{" "}
                            {booking.transactionId}
                        </p>

                        <p>
                            <span className="text-gray-400">
                                Status:
                            </span>{" "}
                            <span className="text-green-400">
                                CONFIRMED
                            </span>
                        </p>

                    </div>
                )}

                <button
                    onClick={() =>
                        navigate(
                            "/my-booking"
                        )
                    }
                    className="w-full bg-primary py-3 rounded-full font-semibold"
                >
                    View My Booking
                </button>

            </div>

        </div>
    );
};

export default PaymentResult;