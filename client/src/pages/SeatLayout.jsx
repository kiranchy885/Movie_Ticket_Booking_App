import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import axios from "axios";

import {
    ArrowRightIcon,
    ClockIcon,
    CrownIcon,
    HeartIcon,
    ArmchairIcon,
    MapPinIcon,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BlurCircle from "../components/BlurCircle";
import Loading from "../components/Loading";

import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";

// =====================================================
// SEAT PRICES - NPR
// =====================================================

const SEAT_PRICES = {
    STANDARD: 150,
    LOVE: 250,
    VIP: 400,
};

// =====================================================
// ROWS
// =====================================================

const rows = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
];

// =====================================================
// GET DATE ONLY
// =====================================================

const getDateOnly = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

// =====================================================
// FORMAT TIME
// =====================================================

const formatTime = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
};

// =====================================================
// GET SEAT TYPE
// =====================================================

const getSeatType = (seat) => {
    const row = String(seat).charAt(0);

    if (row === "I" || row === "J") {
        return "VIP";
    }

    if (
        row === "E" ||
        row === "F" ||
        row === "G" ||
        row === "H"
    ) {
        return "LOVE";
    }

    return "STANDARD";
};

// =====================================================
// GET SEAT TYPE LABEL
// =====================================================

const getSeatTypeLabel = (seat) => {
    const type = getSeatType(seat);

    if (type === "VIP") {
        return "VIP / Luxury";
    }

    if (type === "LOVE") {
        return "Love / Couple";
    }

    return "Standard";
};

// =====================================================
// GET SEATING ZONE
// =====================================================

const getSeatingZone = (seat) => {
    const row = String(seat).charAt(0);

    const seatNumber = Number(
        String(seat).substring(1)
    );

    // Side / Corner seats
    if (seatNumber === 1 || seatNumber === 9) {
        return "SIDE / CORNER";
    }

    // Front
    if (
        row === "A" ||
        row === "B" ||
        row === "C" ||
        row === "D"
    ) {
        return "FRONT";
    }

    // Middle
    if (
        row === "E" ||
        row === "F" ||
        row === "G" ||
        row === "H"
    ) {
        return "MIDDLE";
    }

    // Back
    if (row === "I" || row === "J") {
        return "BACK";
    }

    return "";
};

// =====================================================
// GET SEAT PRICE
// =====================================================

const getSeatPrice = (seat, show) => {
    const type = getSeatType(seat);

    // If backend has seatPrices
    if (show?.seatPrices) {
        if (type === "VIP") {
            return Number(
                show.seatPrices.vip ??
                    SEAT_PRICES.VIP
            );
        }

        if (type === "LOVE") {
            return Number(
                show.seatPrices.love ??
                    SEAT_PRICES.LOVE
            );
        }

        return Number(
            show.seatPrices.standard ??
                show.showPrice ??
                SEAT_PRICES.STANDARD
        );
    }

    // Default frontend prices
    if (type === "VIP") {
        return SEAT_PRICES.VIP;
    }

    if (type === "LOVE") {
        return SEAT_PRICES.LOVE;
    }

    return Number(
        show?.showPrice ||
            SEAT_PRICES.STANDARD
    );
};

// =====================================================
// GET ALL PRICES
// =====================================================

const getShowPrices = (show) => {
    return {
        standard: Number(
            show?.seatPrices?.standard ??
                show?.showPrice ??
                SEAT_PRICES.STANDARD
        ),

        love: Number(
            show?.seatPrices?.love ??
                SEAT_PRICES.LOVE
        ),

        vip: Number(
            show?.seatPrices?.vip ??
                SEAT_PRICES.VIP
        ),
    };
};

// =====================================================
// SEAT BUTTON
// =====================================================

const SeatButton = ({
    seat,
    occupied,
    selected,
    onClick,
}) => {
    const seatType = getSeatType(seat);

    const seatTypeLabel =
        getSeatTypeLabel(seat);

    const seatingZone =
        getSeatingZone(seat);

    // -------------------------------------------------
    // SEAT COLORS
    // -------------------------------------------------

    let normalClass =
        "bg-transparent border-gray-700 text-gray-300 hover:bg-primary/20 hover:border-primary hover:text-white";

    // Standard
    if (seatType === "STANDARD") {
        normalClass =
            "bg-transparent border-gray-700 text-gray-300 hover:bg-primary/20 hover:border-primary hover:text-white";
    }

    // Love
    if (seatType === "LOVE") {
        normalClass =
            "bg-pink-500/10 border-pink-500/50 text-pink-300 hover:bg-pink-500/20 hover:border-pink-400 hover:text-white";
    }

    // VIP
    if (seatType === "VIP") {
        normalClass =
            "bg-yellow-500/10 border-yellow-500/50 text-yellow-300 hover:bg-yellow-500/20 hover:border-yellow-400 hover:text-white";
    }

    return (
        <button
            type="button"
            disabled={occupied}
            onClick={() => onClick(seat)}
            title={
                occupied
                    ? `${seat} - Occupied`
                    : `${seat} - ${seatTypeLabel} - ${seatingZone}`
            }
            className={`
                w-9 h-9
                sm:w-10 sm:h-10
                rounded-md
                border
                text-xs
                font-medium
                transition-all
                duration-200
                flex
                items-center
                justify-center

                ${
                    occupied
                        ? "bg-gray-700 border-gray-700 text-gray-500 cursor-not-allowed"
                        : selected
                        ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                        : normalClass
                }
            `}
        >
            {seat}
        </button>
    );
};

// =====================================================
// SEAT LAYOUT
// =====================================================

const SeatLayout = () => {
    const { id, date } = useParams();

    const navigate = useNavigate();

    const location = useLocation();

    const { user, admin } = useAuth();

    // =====================================================
    // STATES
    // =====================================================

    const [shows, setShows] = useState([]);

    const [selectedTime, setSelectedTime] =
        useState(null);

    const [selectedSeats, setSelectedSeats] =
        useState([]);

    const [occupiedSeats, setOccupiedSeats] =
        useState([]);

    const [movie, setMovie] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [bookingLoading, setBookingLoading] =
        useState(false);

    // =====================================================
    // GET SHOWS
    // =====================================================

    const getShows = async () => {
        try {
            setLoading(true);

            console.log("=================================");
            console.log("SEAT LAYOUT");
            console.log("Movie ID:", id);
            console.log("Selected Date:", date);
            console.log("=================================");

            if (!id) {
                toast.error(
                    "Movie ID is missing."
                );

                return;
            }

            const response = await axios.get(
                `http://localhost:5000/show/${id}`
            );

            console.log(
                "SHOW RESPONSE:",
                response.data
            );

            if (!response.data?.success) {
                toast.error(
                    response.data?.message ||
                        "Unable to load shows."
                );

                return;
            }

            const allShows =
                response.data.shows || [];

            console.log(
                "ALL SHOWS:",
                allShows
            );

            const filteredShows =
                allShows.filter((show) => {
                    if (!show?.showDateTime) {
                        return false;
                    }

                    const showDate =
                        getDateOnly(
                            show.showDateTime
                        );

                    return showDate === date;
                });

            console.log(
                "SHOWS FOR SELECTED DATE:",
                filteredShows
            );

            setShows(filteredShows);

            if (filteredShows.length > 0) {
                const firstShow =
                    filteredShows[0];

                if (
                    firstShow.movie &&
                    typeof firstShow.movie ===
                        "object"
                ) {
                    setMovie(
                        firstShow.movie
                    );
                }
            } else if (
                allShows.length > 0
            ) {
                const firstShow =
                    allShows[0];

                if (
                    firstShow.movie &&
                    typeof firstShow.movie ===
                        "object"
                ) {
                    setMovie(
                        firstShow.movie
                    );
                }
            }
        } catch (error) {
            console.error(
                "GET SHOWS ERROR:",
                error
            );

            console.error(
                "ERROR RESPONSE:",
                error?.response?.data
            );

            toast.error(
                error?.response?.data
                    ?.message ||
                    "Unable to load show timings."
            );
        } finally {
            setLoading(false);
        }
    };

    // =====================================================
    // GET OCCUPIED SEATS
    // =====================================================

    const getOccupiedSeats = async (
        showId
    ) => {
        try {
            if (!showId) return;

            console.log(
                "Getting occupied seats for show:",
                showId
            );

            const response =
                await axios.get(
                    `http://localhost:5000/booking/occupied-seats/${showId}`
                );

            console.log(
                "OCCUPIED SEATS RESPONSE:",
                response.data
            );

            if (response.data?.success) {
                const seats =
                    response.data
                        .occupiedSeats ||
                    response.data.seats ||
                    [];

                setOccupiedSeats(
                    Array.isArray(seats)
                        ? seats
                        : []
                );
            } else {
                setOccupiedSeats([]);
            }
        } catch (error) {
            console.error(
                "GET OCCUPIED SEATS ERROR:",
                error
            );

            setOccupiedSeats([]);
        }
    };

    // =====================================================
    // LOAD SHOWS
    // =====================================================

    useEffect(() => {
        getShows();
    }, [id, date]);

    // =====================================================
    // SELECT SHOW TIME
    // =====================================================

    const handleTimeSelect = async (
        show
    ) => {
        console.log(
            "SELECTED SHOW:",
            show
        );

        setSelectedTime(show);

        setSelectedSeats([]);

        setOccupiedSeats([]);

        await getOccupiedSeats(
            show._id
        );
    };

    // =====================================================
    // CHECK OCCUPIED
    // =====================================================

    const isSeatOccupied = (
        seat
    ) => {
        return occupiedSeats.includes(
            seat
        );
    };

    // =====================================================
    // SELECT SEAT
    // =====================================================

    const handleSeatClick = (
        seat
    ) => {
        if (isSeatOccupied(seat)) {
            toast.error(
                "This seat is already booked."
            );

            return;
        }

        setSelectedSeats(
            (previousSeats) => {
                if (
                    previousSeats.includes(
                        seat
                    )
                ) {
                    return previousSeats.filter(
                        (item) =>
                            item !== seat
                    );
                }

                if (
                    previousSeats.length >=
                    5
                ) {
                    toast.error(
                        "You can select a maximum of 5 seats."
                    );

                    return previousSeats;
                }

                return [
                    ...previousSeats,
                    seat,
                ];
            }
        );
    };

    // =====================================================
    // GET MOVIE
    // =====================================================

    const getMovie = () => {
        if (movie) return movie;

        if (
            selectedTime?.movie &&
            typeof selectedTime.movie ===
                "object"
        ) {
            return selectedTime.movie;
        }

        return null;
    };

    // =====================================================
    // CALCULATE TOTAL
    // =====================================================

    const totalAmount =
        selectedTime
            ? selectedSeats.reduce(
                  (
                      total,
                      seat
                  ) => {
                      return (
                          total +
                          getSeatPrice(
                              seat,
                              selectedTime
                          )
                      );
                  },
                  0
              )
            : 0;

    // =====================================================
    // CHECKOUT
    // =====================================================

    const handleCheckout = async () => {
        try {
            const userId =
                user?._id ||
                user?.id ||
                location.state?.userId ||
                null;

            if (!userId) {
                toast.error(
                    "User information is unavailable. Please refresh the page."
                );

                return;
            }

            if (!selectedTime) {
                toast.error(
                    "Please select a show time."
                );

                return;
            }

            if (
                selectedSeats.length ===
                0
            ) {
                toast.error(
                    "Please select at least one seat."
                );

                return;
            }

            if (
                selectedSeats.length > 5
            ) {
                toast.error(
                    "You can select a maximum of 5 seats."
                );

                return;
            }

            const showId =
                selectedTime._id;

            if (!showId) {
                toast.error(
                    "Show ID is missing."
                );

                console.error(
                    "Selected show:",
                    selectedTime
                );

                return;
            }

            // ---------------------------------------------
            // TOKEN
            // ---------------------------------------------

            const token =
                localStorage.getItem(
                    "userToken"
                ) ||
                localStorage.getItem(
                    "token"
                );

            if (!token) {
                toast.error(
                    "Authentication token not found. Please log in again."
                );

                return;
            }

            setBookingLoading(true);

            const payload = {
                showId: showId,
                selectedSeats:
                    selectedSeats,
            };

            console.log(
                "================================="
            );

            console.log(
                "CHECKOUT PAYLOAD:",
                payload
            );

            console.log(
                "User ID:",
                userId
            );

            console.log(
                "Token:",
                token
            );

            console.log(
                "Total Amount:",
                totalAmount
            );

            console.log(
                "================================="
            );

            const response =
                await axios.post(
                    "http://localhost:5000/booking/create",
                    payload,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

            console.log(
                "CREATE BOOKING RESPONSE:",
                response.data
            );

            if (
                response.data?.success
            ) {
                toast.success(
                    "Booking created successfully!"
                );

                navigate(
                    "/my-booking",
                    {
                        replace: true,
                    }
                );
            } else {
                toast.error(
                    response.data
                        ?.message ||
                        "Unable to create booking."
                );
            }
        } catch (error) {
            console.error(
                "CHECKOUT ERROR:",
                error
            );

            console.error(
                "CHECKOUT RESPONSE:",
                error?.response?.data
            );

            toast.error(
                error?.response?.data
                    ?.message ||
                    error?.message ||
                    "Unable to create booking."
            );
        } finally {
            setBookingLoading(
                false
            );
        }
    };

    // =====================================================
    // LOADING SCREEN
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
    // NO SHOWS
    // =====================================================

    if (shows.length === 0) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col">

                <Navbar />

                <main className="flex-1 relative overflow-hidden">

                    <BlurCircle
                        top="100px"
                        left="0px"
                    />

                    <BlurCircle
                        top="500px"
                        right="0px"
                    />

                    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">

                        <h2 className="text-2xl font-semibold mb-4">
                            No Show Timings Available
                        </h2>

                        <p className="text-gray-400 mb-6 text-center">
                            There are no shows
                            available for{" "}
                            {date}.
                        </p>

                        <button
                            onClick={() =>
                                navigate(
                                    `/movies/${id}`
                                )
                            }
                            className="px-6 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dull transition"
                        >
                            Go Back
                        </button>

                    </div>

                </main>

                <Footer />

            </div>
        );
    }

    // =====================================================
    // CURRENT MOVIE
    // =====================================================

    const currentMovie =
        getMovie();

    // =====================================================
    // CURRENT PRICE LIST
    // =====================================================

    const currentPrices =
        getShowPrices(
            selectedTime
        );

    // =====================================================
    // RENDER
    // =====================================================

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">

            <Navbar />

            <main className="flex-1 relative overflow-hidden">

                <BlurCircle
                    top="100px"
                    left="0px"
                />

                <BlurCircle
                    top="500px"
                    right="0px"
                />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 lg:px-16 py-10">

                    {/* =====================================
                        BACK BUTTON
                    ===================================== */}

                    <button
                        onClick={() =>
                            navigate(
                                `/movies/${id}`
                            )
                        }
                        className="text-gray-400 hover:text-white transition mb-8"
                    >
                        ← Back to movie
                    </button>

                    {/* =====================================
                        MOVIE TITLE
                    ===================================== */}

                    <div className="mb-10">

                        <h1 className="text-2xl sm:text-3xl font-bold">
                            {currentMovie?.title ||
                                currentMovie?.movieName ||
                                "Select your seat"}
                        </h1>

                        <p className="text-gray-400 mt-2">
                            {date}
                        </p>

                    </div>

                    {/* =====================================
                        MAIN GRID
                    ===================================== */}

                    <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-8 lg:gap-12">

                        {/* =================================
                            LEFT - AVAILABLE TIMINGS
                        ================================= */}

                        <aside>

                            <div className="border border-gray-800 rounded-xl bg-gray-900/60 p-5 lg:sticky lg:top-24">

                                <h2 className="text-lg font-semibold mb-6">
                                    Available Timings
                                </h2>

                                <div className="space-y-3">

                                    {shows.map(
                                        (show) => {

                                            const isSelected =
                                                selectedTime?._id ===
                                                show._id;

                                            const showPrices =
                                                getShowPrices(
                                                    show
                                                );

                                            return (
                                                <button
                                                    key={
                                                        show._id
                                                    }
                                                    type="button"
                                                    onClick={() =>
                                                        handleTimeSelect(
                                                            show
                                                        )
                                                    }
                                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition ${
                                                        isSelected
                                                            ? "border-primary bg-primary/20 text-primary"
                                                            : "border-gray-700 bg-black/40 hover:border-primary hover:bg-primary/10"
                                                    }`}
                                                >

                                                    <ClockIcon className="w-4 h-4 flex-shrink-0" />

                                                    <div>

                                                        <p className="font-medium">
                                                            {formatTime(
                                                                show.showDateTime
                                                            )}
                                                        </p>

                                                        <p className="text-xs text-gray-400 mt-1">
                                                            From Rs.{" "}
                                                            {
                                                                showPrices.standard
                                                            }
                                                        </p>

                                                    </div>

                                                </button>
                                            );
                                        }
                                    )}

                                </div>

                            </div>

                        </aside>

                        {/* =================================
                            RIGHT - SEAT SECTION
                        ================================= */}

                        <section>

                            <h2 className="text-2xl font-bold text-center mb-8">
                                Select your seat
                            </h2>

                            {/* SCREEN */}

                            <div className="max-w-2xl mx-auto mb-12 px-6">

                                <div className="h-5 border-t-8 border-primary rounded-[50%] opacity-70" />

                                <p className="text-center text-gray-500 text-sm mt-3">
                                    SCREEN SIDE
                                </p>

                            </div>

                            {/* NO TIME SELECTED */}

                            {!selectedTime ? (
                                <div className="border border-gray-800 rounded-xl p-10 text-center bg-gray-900/30">

                                    <ClockIcon className="w-8 h-8 mx-auto mb-4 text-gray-500" />

                                    <p className="text-gray-400">
                                        Please select a show time from the left.
                                    </p>

                                </div>
                            ) : (
                                <>

                                    {/* =================================
                                        SEAT LAYOUT
                                    ================================= */}

                                    <div className="w-full overflow-x-auto pb-3">

                                        <div className="min-w-[650px] flex flex-col items-center gap-4">

                                            {/* A - B */}

                                            {[
                                                "A",
                                                "B",
                                            ].map(
                                                (
                                                    row
                                                ) => (
                                                    <div
                                                        key={
                                                            row
                                                        }
                                                        className="flex items-center justify-center"
                                                    >

                                                        <div className="flex gap-2">

                                                            {Array.from(
                                                                {
                                                                    length: 9,
                                                                },
                                                                (
                                                                    _,
                                                                    index
                                                                ) => {

                                                                    const seat = `${row}${index + 1}`;

                                                                    return (
                                                                        <SeatButton
                                                                            key={
                                                                                seat
                                                                            }
                                                                            seat={
                                                                                seat
                                                                            }
                                                                            occupied={isSeatOccupied(
                                                                                seat
                                                                            )}
                                                                            selected={selectedSeats.includes(
                                                                                seat
                                                                            )}
                                                                            onClick={
                                                                                handleSeatClick
                                                                            }
                                                                        />
                                                                    );
                                                                }
                                                            )}

                                                        </div>

                                                    </div>
                                                )
                                            )}

                                            <div className="h-3" />

                                            {/* C/D + E/F */}

                                            {[
                                                [
                                                    "C",
                                                    "E",
                                                ],
                                                [
                                                    "D",
                                                    "F",
                                                ],
                                            ].map(
                                                ([
                                                    leftRow,
                                                    rightRow,
                                                ]) => (
                                                    <div
                                                        key={`${leftRow}-${rightRow}`}
                                                        className="flex items-center justify-center"
                                                    >

                                                        {/* LEFT */}

                                                        <div className="flex gap-2">

                                                            {Array.from(
                                                                {
                                                                    length: 4,
                                                                },
                                                                (
                                                                    _,
                                                                    index
                                                                ) => {

                                                                    const seat = `${leftRow}${index + 1}`;

                                                                    return (
                                                                        <SeatButton
                                                                            key={
                                                                                seat
                                                                            }
                                                                            seat={
                                                                                seat
                                                                            }
                                                                            occupied={isSeatOccupied(
                                                                                seat
                                                                            )}
                                                                            selected={selectedSeats.includes(
                                                                                seat
                                                                            )}
                                                                            onClick={
                                                                                handleSeatClick
                                                                            }
                                                                        />
                                                                    );
                                                                }
                                                            )}

                                                        </div>

                                                        {/* AISLE */}

                                                        <div className="w-12 sm:w-16" />

                                                        {/* RIGHT */}

                                                        <div className="flex gap-2">

                                                            {Array.from(
                                                                {
                                                                    length: 5,
                                                                },
                                                                (
                                                                    _,
                                                                    index
                                                                ) => {

                                                                    const seatNumber =
                                                                        index +
                                                                        5;

                                                                    const seat = `${rightRow}${seatNumber}`;

                                                                    return (
                                                                        <SeatButton
                                                                            key={
                                                                                seat
                                                                            }
                                                                            seat={
                                                                                seat
                                                                            }
                                                                            occupied={isSeatOccupied(
                                                                                seat
                                                                            )}
                                                                            selected={selectedSeats.includes(
                                                                                seat
                                                                            )}
                                                                            onClick={
                                                                                handleSeatClick
                                                                            }
                                                                        />
                                                                    );
                                                                }
                                                            )}

                                                        </div>

                                                    </div>
                                                )
                                            )}

                                            <div className="h-3" />

                                            {/* G/H + I/J */}

                                            {[
                                                [
                                                    "G",
                                                    "I",
                                                ],
                                                [
                                                    "H",
                                                    "J",
                                                ],
                                            ].map(
                                                ([
                                                    leftRow,
                                                    rightRow,
                                                ]) => (
                                                    <div
                                                        key={`${leftRow}-${rightRow}`}
                                                        className="flex items-center justify-center"
                                                    >

                                                        {/* LEFT */}

                                                        <div className="flex gap-2">

                                                            {Array.from(
                                                                {
                                                                    length: 4,
                                                                },
                                                                (
                                                                    _,
                                                                    index
                                                                ) => {

                                                                    const seat = `${leftRow}${index + 1}`;

                                                                    return (
                                                                        <SeatButton
                                                                            key={
                                                                                seat
                                                                            }
                                                                            seat={
                                                                                seat
                                                                            }
                                                                            occupied={isSeatOccupied(
                                                                                seat
                                                                            )}
                                                                            selected={selectedSeats.includes(
                                                                                seat
                                                                            )}
                                                                            onClick={
                                                                                handleSeatClick
                                                                            }
                                                                        />
                                                                    );
                                                                }
                                                            )}

                                                        </div>

                                                        {/* AISLE */}

                                                        <div className="w-12 sm:w-16" />

                                                        {/* RIGHT */}

                                                        <div className="flex gap-2">

                                                            {Array.from(
                                                                {
                                                                    length: 5,
                                                                },
                                                                (
                                                                    _,
                                                                    index
                                                                ) => {

                                                                    const seatNumber =
                                                                        index +
                                                                        5;

                                                                    const seat = `${rightRow}${seatNumber}`;

                                                                    return (
                                                                        <SeatButton
                                                                            key={
                                                                                seat
                                                                            }
                                                                            seat={
                                                                                seat
                                                                            }
                                                                            occupied={isSeatOccupied(
                                                                                seat
                                                                            )}
                                                                            selected={selectedSeats.includes(
                                                                                seat
                                                                            )}
                                                                            onClick={
                                                                                handleSeatClick
                                                                            }
                                                                        />
                                                                    );
                                                                }
                                                            )}

                                                        </div>

                                                    </div>
                                                )
                                            )}

                                        </div>

                                    </div>

                                    {/* =================================
                                        OLD SIMPLE LEGEND
                                    ================================= */}

                                    <div className="flex justify-center flex-wrap gap-6 mt-12 text-sm text-gray-400">

                                        <div className="flex items-center gap-2">

                                            <span className="w-4 h-4 rounded border border-gray-700" />

                                            Available

                                        </div>

                                        <div className="flex items-center gap-2">

                                            <span className="w-4 h-4 rounded bg-primary" />

                                            Selected

                                        </div>

                                        <div className="flex items-center gap-2">

                                            <span className="w-4 h-4 rounded bg-gray-700" />

                                            Occupied

                                        </div>

                                    </div>

                                </>
                            )}

                        </section>

                    </div>

                    {/* Seat Types */}
<div className="flex flex-wrap justify-center gap-3">

    {/* Standard */}
    <button
        type="button"
        onClick={() =>
            navigate(
                `/seat-layout/standard/${id}/${date}`
            )
        }
        className="flex items-center gap-2 px-3 py-2 rounded-lg
        bg-gray-900/70 border border-gray-800
        hover:border-primary hover:bg-primary/10
        transition-all duration-200 cursor-pointer"
    >
        <span className="w-3 h-3 rounded bg-gray-500" />

        <div className="text-left">
            <p className="text-sm font-medium">
                Standard
            </p>

            <p className="text-[11px] text-gray-500">
                Rows A-D
            </p>
        </div>
    </button>

    {/* Love / Couple */}
    <button
        type="button"
        onClick={() =>
            navigate(
                `/seat-layout/love/${id}/${date}`
            )
        }
        className="flex items-center gap-2 px-3 py-2 rounded-lg
        bg-gray-900/70 border border-gray-800
        hover:border-pink-500 hover:bg-pink-500/10
        transition-all duration-200 cursor-pointer"
    >
        <span className="w-3 h-3 rounded bg-pink-500" />

        <div className="text-left">
            <p className="text-sm font-medium">
                Love / Couple
            </p>

            <p className="text-[11px] text-gray-500">
                Rows E-H
            </p>
        </div>
    </button>
    

    {/* VIP */}
    <button
        type="button"
        onClick={() =>
            navigate(
                `/seat-layout/vip/${id}/${date}`
            )
        }
        className="flex items-center gap-2 px-3 py-2 rounded-lg
        bg-gray-900/70 border border-gray-800
        hover:border-yellow-500 hover:bg-yellow-500/10
        transition-all duration-200 cursor-pointer"
    >
        <span className="w-3 h-3 rounded bg-yellow-500" />

        <div className="text-left">
            <p className="text-sm font-medium">
                VIP / Luxury
            </p>

            <p className="text-[11px] text-gray-500">
                Rows I-J
            </p>
        </div>
    </button>

</div>


                    {/* =================================================
                        CHECKOUT
                    ================================================= */}

                    <div className="border-t border-gray-800 mt-14 pt-8">

                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

                            {/* SELECTED SEATS */}

                            <div>

                                <p className="text-gray-400 text-sm">
                                    Selected seats
                                </p>

                                <p className="font-semibold mt-1 text-base">

                                    {selectedSeats.length >
                                    0
                                        ? selectedSeats.join(
                                              ", "
                                          )
                                        : "No seats selected"}

                                </p>

                                {selectedTime && (
                                    <p className="text-gray-400 text-sm mt-2">
                                        Time:{" "}
                                        {formatTime(
                                            selectedTime.showDateTime
                                        )}
                                    </p>
                                )}

                            </div>

                            {/* TOTAL */}

                            <div className="flex flex-col sm:flex-row sm:items-center gap-5">

                                <div className="text-left sm:text-right">

                                    <p className="text-gray-400 text-sm">
                                        Total
                                    </p>

                                    <p className="text-2xl font-bold">
                                        Rs.{" "}
                                        {totalAmount}
                                    </p>

                                </div>

                                <button
                                    type="button"
                                    onClick={
                                        handleCheckout
                                    }
                                    disabled={
                                        bookingLoading ||
                                        !selectedTime ||
                                        selectedSeats.length ===
                                            0
                                    }
                                    className="px-6 py-3 rounded-lg bg-primary text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-dull transition"
                                >

                                    {bookingLoading
                                        ? "Processing..."
                                        : "Proceed to Checkout"}

                                    {!bookingLoading && (
                                        <ArrowRightIcon className="w-5 h-5" />
                                    )}

                                </button>

                            </div>

                        </div>

                    </div>

                </div>

            </main>

            <Footer />

        </div>
    );
};

export default SeatLayout;