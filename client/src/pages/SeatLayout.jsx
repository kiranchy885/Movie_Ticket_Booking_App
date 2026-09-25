import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";
import axios from "axios";

import {
    ArrowRightIcon,
    ClockIcon,
    MapPinIcon,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BlurCircle from "../components/BlurCircle";
import Loading from "../components/Loading";

import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";

// SEAT PRICING MODEL (based on admin-set show price)
// -----------------------------------------------------
//   STANDARD (FRONT / screen side) = show price + 20 %  -> 120 %
//   PREMIUM  (BACK  / end)         = show price + 15 %  -> 115 %
//   REGULAR  (MIDDLE)              = show price         -> 100 %

const SEAT_TYPE_PERCENTAGES = {
    STANDARD: 120,
    PREMIUM: 115,
    REGULAR: 100,
};

const SEAT_TYPES_ORDER = ["STANDARD", "PREMIUM", "REGULAR"];

const DEFAULT_BASE_PRICE = 200;

// ROWS

const FRONT_ROWS = ["A", "B", "C", "D"];
const MIDDLE_ROWS = ["E", "F", "G", "H"];
const BACK_ROWS = ["I", "J"];

// SEAT TYPE VISUAL CONFIG

const SEAT_TYPE_CONFIG = {
    STANDARD: {
        label: "STANDARD",
        zone: "Front rows (screen side)",
        shortZone: "FRONT",
        percentage: SEAT_TYPE_PERCENTAGES.STANDARD,
        dot: "bg-sky-500",
        border: "border-sky-500",
        chip: "text-sky-300 bg-sky-900/20 border-sky-500/40",
        seat:
            "bg-sky-500/10 border-sky-500/50 text-sky-300 hover:bg-sky-500/20 hover:border-sky-400 hover:text-white",
    },
    PREMIUM: {
        label: "PREMIUM",
        zone: "Back rows",
        shortZone: "BACK",
        percentage: SEAT_TYPE_PERCENTAGES.PREMIUM,
        dot: "bg-amber-400",
        border: "border-amber-400",
        chip: "text-amber-300 bg-amber-900/20 border-amber-400/40",
        seat:
            "bg-amber-400/10 border-amber-400/50 text-amber-300 hover:bg-amber-400/20 hover:border-amber-300 hover:text-white",
    },
    REGULAR: {
        label: "REGULAR",
        zone: "Middle rows",
        shortZone: "MIDDLE",
        percentage: SEAT_TYPE_PERCENTAGES.REGULAR,
        dot: "bg-emerald-500",
        border: "border-emerald-500",
        chip: "text-emerald-300 bg-emerald-900/20 border-emerald-500/40",
        seat:
            "bg-emerald-500/10 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400 hover:text-white",
    },
};

// POLLING INTERVAL
const OCCUPIED_POLL_MS = 2500;

// DATE / TIME HELPERS

const getDateOnly = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

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

// SEAT TYPE HELPERS

const normalizeSeatType = (value) => {
    if (!value) return null;
    const v = String(value).trim().toUpperCase();
    if (v === "STANDARD" || v === "REGULAR" || v === "PREMIUM") return v;
    if (v === "VIP") return "PREMIUM";
    if (v === "LOVE") return "REGULAR";
    return null;
};

const getSeatTypeByRow = (seat) => {
    const row = String(seat).charAt(0).toUpperCase();
    if (BACK_ROWS.includes(row)) return "PREMIUM";
    if (MIDDLE_ROWS.includes(row)) return "REGULAR";
    return "STANDARD";
};

const getSeatTypeFromShow = (seat, show) => {
    const mapping = show?.seatTypeMapping;
    if (mapping && typeof mapping === "object") {
        const row = String(seat).charAt(0).toUpperCase();
        const mapped = normalizeSeatType(mapping[row]);
        if (mapped) return mapped;
    }
    return getSeatTypeByRow(seat);
};

const getSeatTypeLabel = (seat, show) => {
    const type = getSeatTypeFromShow(seat, show);
    const config = SEAT_TYPE_CONFIG[type];
    if (!config) return "Standard";
    return `${config.label} • ${config.zone}`;
};

const getSeatingZone = (seat) => {
    const row = String(seat).charAt(0).toUpperCase();
    const seatNumber = Number(String(seat).substring(1));
    if (seatNumber === 1 || seatNumber === 9) return "SIDE / CORNER";
    if (FRONT_ROWS.includes(row)) return "FRONT";
    if (MIDDLE_ROWS.includes(row)) return "MIDDLE";
    if (BACK_ROWS.includes(row)) return "BACK";
    return "";
};

// BASE PRICE

const extractBasePrice = (source) => {
    if (!source) return null;
    const candidates = [
        source.showPrice,
        source.basePrice,
        source.price,
        source.ticketPrice,
        source.amount,
        source.seatPrices?.standard,
    ];
    for (const candidate of candidates) {
        const value = Number(candidate);
        if (Number.isFinite(value) && value > 0) return value;
    }
    return null;
};

const getBasePrice = (show) => {
    const price = extractBasePrice(show);
    return price ?? DEFAULT_BASE_PRICE;
};

// SEAT PRICE

const getSeatPrice = (seat, show) => {
    const type = getSeatTypeFromShow(seat, show);
    const percentage =
        SEAT_TYPE_PERCENTAGES[type] ?? SEAT_TYPE_PERCENTAGES.REGULAR;
    const base = getBasePrice(show);
    return Math.round((base * percentage) / 100);
};

const getSeatPercentage = (seat, show) => {
    const type = getSeatTypeFromShow(seat, show);
    return SEAT_TYPE_PERCENTAGES[type] ?? SEAT_TYPE_PERCENTAGES.REGULAR;
};

const getShowPrices = (show) => {
    const base = getBasePrice(show);
    const prices = {};
    SEAT_TYPES_ORDER.forEach((type) => {
        prices[type] = Math.round((base * SEAT_TYPE_PERCENTAGES[type]) / 100);
    });
    return prices;
};

const getAvailableSeatTypes = (show) => {
    const mapping = show?.seatTypeMapping;
    if (mapping && typeof mapping === "object" && Object.keys(mapping).length) {
        const set = new Set();
        Object.values(mapping).forEach((value) => {
            const type = normalizeSeatType(value);
            if (type) set.add(type);
        });
        if (set.size > 0) {
            return SEAT_TYPES_ORDER.filter((type) => set.has(type));
        }
    }
    return [...SEAT_TYPES_ORDER];
};

// THEATER HELPERS

const getTheaterIdFromShow = (show) => {
    if (!show) return "";
    if (show.theaterId && typeof show.theaterId === "object") {
        return String(show.theaterId._id || show.theaterId.id || "");
    }
    if (show.theaterId) return String(show.theaterId);
    if (show.theater && typeof show.theater === "object") {
        return String(show.theater._id || show.theater.id || "");
    }
    return "";
};

const getTheaterInfoFromShow = (show) => {
    if (!show) return null;
    if (show.theaterId && typeof show.theaterId === "object") {
        return {
            _id: show.theaterId._id || show.theaterId.id,
            name: show.theaterId.name || "",
            city: show.theaterId.city || "",
            address: show.theaterId.address || "",
        };
    }
    if (show.theater && typeof show.theater === "object") {
        return {
            _id: show.theater._id || show.theater.id,
            name: show.theater.name || "",
            city: show.theater.city || "",
            address: show.theater.address || "",
        };
    }
    if (show.theaterName) {
        return {
            _id: show.theaterId || "",
            name: show.theaterName,
            city: show.theaterCity || "",
            address: show.theaterAddress || "",
        };
    }
    return null;
};

// SEAT BUTTON

const SeatButton = ({ seat, occupied, selected, onClick, show }) => {
    const seatType = getSeatTypeFromShow(seat, show);
    const config = SEAT_TYPE_CONFIG[seatType] || SEAT_TYPE_CONFIG.REGULAR;
    const seatTypeLabel = getSeatTypeLabel(seat, show);
    const seatingZone = getSeatingZone(seat);
    const price = getSeatPrice(seat, show);
    const percentage = getSeatPercentage(seat, show);

    return (
        <button
            type="button"
            disabled={occupied}
            onClick={() => onClick(seat)}
            title={
                occupied
                    ? `${seat} - Occupied`
                    : `${seat} - ${seatTypeLabel} - ${seatingZone} - Rs. ${price} (${percentage}% of show price)`
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
                        : config.seat
                }
            `}
        >
            {seat}
        </button>
    );
};

// SEAT LAYOUT

const SeatLayout = () => {
    const { id, date } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();

    // THEATER CONTEXT

    const theaterFromState = location.state || {};

    const theaterIdFromState =
        theaterFromState.theaterId || searchParams.get("theater") || "";

    const theaterNameFromState = theaterFromState.theaterName || "";
    const theaterCityFromState = theaterFromState.theaterCity || "";
    const theaterAddressFromState = theaterFromState.theaterAddress || "";

    // STATES

    const [shows, setShows] = useState([]);
    const [selectedTime, setSelectedTime] = useState(null);
    const [selectedSeats, setSelectedSeats] = useState([]);
    const [occupiedSeats, setOccupiedSeats] = useState([]);
    const [movie, setMovie] = useState(null);
    const [loading, setLoading] = useState(true);
    const [bookingLoading, setBookingLoading] = useState(false);

    const [showPricesMap, setShowPricesMap] = useState({});

    const [resolvedTheater, setResolvedTheater] = useState(
        theaterNameFromState
            ? {
                  _id: theaterIdFromState,
                  name: theaterNameFromState,
                  city: theaterCityFromState,
                  address: theaterAddressFromState,
              }
            : null
    );

    // Guard against overlapping occupied-seat fetches
    const fetchingOccupiedRef = useRef(false);

    // GET SHOWS

    const getShows = async () => {
        try {
            setLoading(true);

            
            console.log("SEAT LAYOUT");
            console.log("Movie ID:", id);
            console.log("Selected Date:", date);
            console.log("Theater ID (from state/URL):", theaterIdFromState);
            

            if (!id) {
                toast.error("Movie ID is missing.");
                return;
            }

            const response = await axios.get(
                `http://localhost:5000/show/${id}`
            );

            if (!response.data?.success) {
                toast.error(response.data?.message || "Unable to load shows.");
                return;
            }

            const allShows = response.data.shows || [];

            const dateFiltered = allShows.filter((show) => {
                if (!show?.showDateTime) return false;
                return getDateOnly(show.showDateTime) === date;
            });

            const filteredShows = theaterIdFromState
                ? dateFiltered.filter(
                      (show) =>
                          getTheaterIdFromShow(show) ===
                          String(theaterIdFromState)
                  )
                : dateFiltered;

            console.log("SHOWS FOR SELECTED DATE & THEATER:", filteredShows);

            filteredShows.forEach((show) => {
                console.log(
                    `Show ${show._id} price fields:`,
                    {
                        showPrice: show.showPrice,
                        basePrice: show.basePrice,
                        price: show.price,
                        ticketPrice: show.ticketPrice,
                        amount: show.amount,
                        seatPrices: show.seatPrices,
                    }
                );
            });

            setShows(filteredShows);

            if (filteredShows.length > 0) {
                const firstShow = filteredShows[0];

                if (firstShow.movie && typeof firstShow.movie === "object") {
                    setMovie(firstShow.movie);
                }

                if (!resolvedTheater) {
                    const theaterInfo = getTheaterInfoFromShow(firstShow);
                    if (theaterInfo) setResolvedTheater(theaterInfo);
                }
            } else if (allShows.length > 0) {
                const firstShow = allShows[0];
                if (firstShow.movie && typeof firstShow.movie === "object") {
                    setMovie(firstShow.movie);
                }
            }
        } catch (error) {
            console.error("GET SHOWS ERROR:", error);
            toast.error(
                error?.response?.data?.message || "Unable to load show timings."
            );
        } finally {
            setLoading(false);
        }
    };

    // FETCH THE BASE PRICE FOR A SINGLE SHOW

    const fetchSingleShowPrice = async (show) => {
        const local = extractBasePrice(show);
        if (local != null) return local;

        if (!show?._id) return DEFAULT_BASE_PRICE;

        try {
            const res = await axios.get(
                `http://localhost:5000/show/single/${show._id}`
            );
            const data = res.data?.show || res.data?.data || res.data;
            const fetched = extractBasePrice(data);
            if (fetched != null) return fetched;
        } catch (error) {
            console.warn(
                `Could not fetch price for show ${show._id}:`,
                error?.response?.data || error?.message
            );
        }

        return DEFAULT_BASE_PRICE;
    };

    // FETCH PRICES FOR ALL SHOWS

    useEffect(() => {
        if (shows.length === 0) return;

        let cancelled = false;

        const loadAllPrices = async () => {
            const entries = await Promise.all(
                shows.map(async (show) => {
                    const price = await fetchSingleShowPrice(show);
                    return [show._id, price];
                })
            );

            if (cancelled) return;

            const map = {};
            entries.forEach(([showId, price]) => {
                map[showId] = price;
            });

            console.log("💰 Show prices map:", map);
            setShowPricesMap(map);
        };

        loadAllPrices();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line
    }, [shows]);

    // GET OCCUPIED SEATS (per show)

    const getOccupiedSeats = useCallback(async (showId) => {
        if (!showId) return;
        if (fetchingOccupiedRef.current) return;
        fetchingOccupiedRef.current = true;

        try {
            console.log("🔍 Fetching occupied seats for show:", showId);

            const response = await axios.get(
                `http://localhost:5000/booking/occupied-seats/${showId}`
            );

            let seats = [];
            const rawData = response.data;

            if (rawData?.success === true || rawData?.success === undefined) {
                const candidates = [
                    rawData?.occupiedSeats,
                    rawData?.seats,
                    rawData?.data?.occupiedSeats,
                    rawData?.data?.seats,
                    rawData?.data,
                ];

                for (const candidate of candidates) {
                    if (Array.isArray(candidate)) {
                        seats = candidate;
                        break;
                    }
                    if (candidate && typeof candidate === "object") {
                        seats = Object.keys(candidate);
                        break;
                    }
                }
            }

            seats = seats.map((s) => String(s).trim()).filter(Boolean);

            setOccupiedSeats(seats);
        } catch (error) {
            console.error("❌ GET OCCUPIED SEATS ERROR:", error);
        } finally {
            fetchingOccupiedRef.current = false;
        }
    }, []);

    // LOAD SHOWS

    useEffect(() => {
        getShows();
        // eslint-disable-next-line
    }, [id, date]);

    // SELECT SHOW TIME

    const handleTimeSelect = async (show) => {
        console.log("SELECTED SHOW:", show);

        setSelectedTime(show);
        setSelectedSeats([]);
        setOccupiedSeats([]);

        if (showPricesMap[show._id] == null) {
            const price = await fetchSingleShowPrice(show);
            setShowPricesMap((prev) => ({ ...prev, [show._id]: price }));
        }

        await getOccupiedSeats(show._id);
    };

    // LIVE POLLING OF OCCUPIED SEATS
    useEffect(() => {
        if (!selectedTime?._id) return;

        const interval = setInterval(() => {
            if (document.visibilityState !== "visible") return;
            getOccupiedSeats(selectedTime._id);
        }, OCCUPIED_POLL_MS);

        return () => clearInterval(interval);
    }, [selectedTime?._id, getOccupiedSeats]);

    // LISTEN FOR bookingsUpdated → refresh occupied seats
    useEffect(() => {
        const handler = () => {
            if (selectedTime?._id) {
                getOccupiedSeats(selectedTime._id);
            }
        };
        window.addEventListener("bookingsUpdated", handler);
        return () => window.removeEventListener("bookingsUpdated", handler);
    }, [selectedTime?._id, getOccupiedSeats]);


    // CHECK OCCUPIED

    const isSeatOccupied = (seat) => occupiedSeats.includes(seat);

    // SELECT SEAT

    const handleSeatClick = (seat) => {
        if (isSeatOccupied(seat)) {
            toast.error("This seat is already booked.");
            return;
        }

        setSelectedSeats((previousSeats) => {
            if (previousSeats.includes(seat)) {
                return previousSeats.filter((item) => item !== seat);
            }

            if (previousSeats.length >= 5) {
                toast.error("You can select a maximum of 5 seats.");
                return previousSeats;
            }

            return [...previousSeats, seat];
        });
    };

    // GET MOVIE

    const getMovie = () => {
        if (movie) return movie;
        if (selectedTime?.movie && typeof selectedTime.movie === "object") {
            return selectedTime.movie;
        }
        return null;
    };

    // EFFECTIVE SHOW

    const effectiveShow = selectedTime
        ? {
              ...selectedTime,
              showPrice:
                  showPricesMap[selectedTime._id] ??
                  extractBasePrice(selectedTime) ??
                  DEFAULT_BASE_PRICE,
          }
        : null;

    // TOTAL

    const totalAmount = effectiveShow
        ? selectedSeats.reduce(
              (total, seat) => total + getSeatPrice(seat, effectiveShow),
              0
          )
        : 0;

    // CHECKOUT

    const handleCheckout = async () => {
        try {
            const userId =
                user?._id || user?.id || location.state?.userId || null;

            if (!userId) {
                toast.error(
                    "User information is unavailable. Please refresh the page."
                );
                return;
            }

            if (!selectedTime) {
                toast.error("Please select a show time.");
                return;
            }

            if (selectedSeats.length === 0) {
                toast.error("Please select at least one seat.");
                return;
            }

            if (selectedSeats.length > 5) {
                toast.error("You can select a maximum of 5 seats.");
                return;
            }

            const showId = selectedTime._id;

            if (!showId) {
                toast.error("Show ID is missing.");
                return;
            }

            const token =
                localStorage.getItem("userToken") ||
                localStorage.getItem("token");

            if (!token) {
                toast.error(
                    "Authentication token not found. Please log in again."
                );
                return;
            }

            setBookingLoading(true);

            // -------- Build per-seat pricing details --------
            const seatDetails = selectedSeats.map((seat) => {
                const type = getSeatTypeFromShow(seat, effectiveShow);
                const price = getSeatPrice(seat, effectiveShow);
                const percentage = getSeatPercentage(seat, effectiveShow);
                return { seat, type, price, percentage };
            });

            const basePrice = getBasePrice(effectiveShow);
            const amount = seatDetails.reduce((sum, s) => sum + s.price, 0);

            const payload = {
                showId,
                selectedSeats,
                seatDetails,
                basePrice,
                amount,
                theaterId:
                    resolvedTheater?._id || theaterIdFromState || undefined,
            };

            console.log("CHECKOUT PAYLOAD:", payload);

            const response = await axios.post(
                "http://localhost:5000/booking/create",
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (response.data?.success) {
                toast.success("Booking created successfully!");

                // 🔄 Immediately refresh occupied seats so the ones
                // the user just booked show as occupied before we
                // navigate away.
                try {
                    await getOccupiedSeats(showId);
                } catch (e) {
                    // Non-fatal; navigation happens anyway
                }

                // Notify other pages (Navbar, MyBooking, etc.)
                window.dispatchEvent(new Event("bookingsUpdated"));

                navigate("/my-booking", { replace: true });
            } else {
                toast.error(
                    response.data?.message || "Unable to create booking."
                );
            }
        } catch (error) {
            console.error("CHECKOUT ERROR:", error);
            toast.error(
                error?.response?.data?.message ||
                    error?.message ||
                    "Unable to create booking."
            );
        } finally {
            setBookingLoading(false);
        }
    };

    // LOADING SCREEN

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

    // NO SHOWS

    if (shows.length === 0) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col">
                <Navbar />
                <main className="flex-1 relative overflow-hidden">
                    <BlurCircle top="100px" left="0px" />
                    <BlurCircle top="500px" right="0px" />
                    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
                        <h2 className="text-2xl font-semibold mb-4">
                            No Show Timings Available
                        </h2>
                        <p className="text-gray-400 mb-6 text-center">
                            There are no shows available for {date}
                            {resolvedTheater?.name
                                ? ` at ${resolvedTheater.name}`
                                : ""}
                            .
                        </p>
                        <button
                            onClick={() => navigate(`/movies/${id}`)}
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

    const currentMovie = getMovie();

    const basePrice = effectiveShow ? getBasePrice(effectiveShow) : 0;

    const currentPrices = effectiveShow
        ? getShowPrices(effectiveShow)
        : { STANDARD: 0, PREMIUM: 0, REGULAR: 0 };

    const availableTypes = effectiveShow
        ? getAvailableSeatTypes(effectiveShow)
        : [...SEAT_TYPES_ORDER];

    const seatBreakdown = effectiveShow
        ? SEAT_TYPES_ORDER.map((type) => {
              const seats = selectedSeats.filter(
                  (seat) =>
                      getSeatTypeFromShow(seat, effectiveShow) === type
              );
              return {
                  type,
                  seats,
                  count: seats.length,
                  unitPrice: currentPrices[type],
                  subtotal: currentPrices[type] * seats.length,
              };
          }).filter((item) => item.count > 0)
        : [];

    // RENDER

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            <Navbar />

            <main className="flex-1 relative overflow-hidden">
                <BlurCircle top="100px" left="0px" />
                <BlurCircle top="500px" right="0px" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 lg:px-16 py-10">
                    {/* BACK BUTTON */}
                    <button
                        onClick={() => navigate(`/movies/${id}`)}
                        className="text-gray-400 hover:text-white transition mb-8"
                    >
                        ← Back to movie
                    </button>

                    {/* MOVIE TITLE + THEATER INFO */}
                    <div className="mb-10">
                        <h1 className="text-2xl sm:text-3xl font-bold">
                            {currentMovie?.title ||
                                currentMovie?.movieName ||
                                "Select your seat"}
                        </h1>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-gray-400">
                            <span>{date}</span>

                            {resolvedTheater?.name && (
                                <>
                                    <span className="text-gray-600">•</span>
                                    <span className="flex items-center gap-1.5 text-primary">
                                        <MapPinIcon className="w-4 h-4" />
                                        <span className="font-medium">
                                            {resolvedTheater.name}
                                        </span>
                                        {resolvedTheater.city && (
                                            <span className="text-gray-400">
                                                , {resolvedTheater.city}
                                            </span>
                                        )}
                                    </span>
                                </>
                            )}
                        </div>

                        {resolvedTheater?.address && (
                            <p className="text-xs text-gray-500 mt-1">
                                {resolvedTheater.address}
                            </p>
                        )}
                    </div>

                    {/* MAIN GRID */}
                    <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-8 lg:gap-12">
                        {/* LEFT - AVAILABLE TIMINGS */}
                        <aside>
                            <div className="border border-gray-800 rounded-xl bg-gray-900/60 p-5 lg:sticky lg:top-24">
                                <h2 className="text-lg font-semibold mb-6">
                                    Available Timings
                                </h2>

                                <div className="space-y-3">
                                    {shows.map((show) => {
                                        const isSelected =
                                            selectedTime?._id === show._id;

                                        const knownPrice =
                                            showPricesMap[show._id] ??
                                            extractBasePrice(show);

                                        const minPrice = knownPrice
                                            ? Math.min(
                                                  ...SEAT_TYPES_ORDER.map(
                                                      (t) =>
                                                          Math.round(
                                                              (knownPrice *
                                                                  SEAT_TYPE_PERCENTAGES[
                                                                      t
                                                                  ]) /
                                                                  100
                                                          )
                                                  )
                                              )
                                            : null;

                                        return (
                                            <button
                                                key={show._id}
                                                type="button"
                                                onClick={() =>
                                                    handleTimeSelect(show)
                                                }
                                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition ${
                                                    isSelected
                                                        ? "border-primary bg-primary/20 text-primary"
                                                        : "border-gray-700 bg-black/40 hover:border-primary hover:bg-primary/10"
                                                }`}
                                            >
                                                <ClockIcon className="w-4 h-4 shrink-0" />
                                                <div>
                                                    <p className="font-medium">
                                                        {formatTime(
                                                            show.showDateTime
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {minPrice != null
                                                            ? `From Rs. ${minPrice}`
                                                            : "Tap to view price"}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </aside>

                        {/* RIGHT - SEAT SECTION */}
                        <section>
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                <h2 className="text-2xl font-bold">
                                    Select your seat
                                </h2>

                                {selectedTime && occupiedSeats.length > 0 && (
                                    <span className="text-xs text-gray-400 bg-gray-800/50 border border-gray-700 px-3 py-1 rounded-full">
                                        {occupiedSeats.length} seat
                                        {occupiedSeats.length === 1
                                            ? ""
                                            : "s"}{" "}
                                        already booked
                                    </span>
                                )}
                            </div>

                            {/* PRICE MODEL NOTE */}
                            {effectiveShow && (
                                <div className="mb-8 rounded-xl border border-gray-800 bg-gray-900/40 px-4 py-3">
                                    <p className="text-xs sm:text-sm text-gray-400">
                                        Show price set by admin:{" "}
                                        <span className="text-white font-semibold">
                                            Rs. {basePrice}
                                        </span>
                                        . Seat prices are calculated from this
                                        amount:
                                    </p>

                                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-2">
                                        {availableTypes.map((type) => {
                                            const config =
                                                SEAT_TYPE_CONFIG[type];
                                            if (!config) return null;
                                            const diff = config.percentage - 100;
                                            const diffLabel =
                                                diff === 0
                                                    ? "base"
                                                    : diff > 0
                                                    ? `+${diff}%`
                                                    : `${diff}%`;
                                            return (
                                                <span
                                                    key={type}
                                                    className="flex items-center gap-1.5 text-xs"
                                                >
                                                    <span
                                                        className={`w-2.5 h-2.5 rounded-full ${config.dot}`}
                                                    />
                                                    <span className="text-gray-300 font-medium">
                                                        {config.label}
                                                    </span>
                                                    <span className="text-gray-500">
                                                        ({diffLabel}) =
                                                    </span>
                                                    <span className="text-white font-semibold">
                                                        Rs.{" "}
                                                        {currentPrices[type]}
                                                    </span>
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* SCREEN */}
                            <div className="max-w-2xl mx-auto mb-12 px-6">
                                <div className="h-5 border-t-8 border-primary rounded-[50%] opacity-70" />
                                <p className="text-center text-gray-500 text-sm mt-3">
                                    SCREEN
                                </p>
                            </div>

                            {/* NO TIME SELECTED */}
                            {!selectedTime ? (
                                <div className="border border-gray-800 rounded-xl p-10 text-center bg-gray-900/30">
                                    <ClockIcon className="w-8 h-8 mx-auto mb-4 text-gray-500" />
                                    <p className="text-gray-400">
                                        Please select a show time from the
                                        left.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* SEAT LAYOUT */}
                                    <div className="w-full overflow-x-auto pb-3">
                                        <div className="min-w-162.5 flex flex-col items-center gap-4">
                                            {/* STANDARD - FRONT */}
                                            <div className="w-full flex justify-start pl-4">
                                                <span
                                                    className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                                                        SEAT_TYPE_CONFIG
                                                            .STANDARD.chip
                                                    }`}
                                                >
                                                    STANDARD • FRONT (SCREEN
                                                    SIDE) • +20% • Rs.{" "}
                                                    {
                                                        currentPrices.STANDARD
                                                    }
                                                </span>
                                            </div>

                                            {["A", "B"].map((row) => (
                                                <div
                                                    key={row}
                                                    className="flex items-center justify-center"
                                                >
                                                    <div className="flex gap-2">
                                                        {Array.from(
                                                            { length: 9 },
                                                            (_, index) => {
                                                                const seat = `${row}${index + 1}`;
                                                                return (
                                                                    <SeatButton
                                                                        key={seat}
                                                                        seat={seat}
                                                                        occupied={isSeatOccupied(seat)}
                                                                        selected={selectedSeats.includes(seat)}
                                                                        onClick={handleSeatClick}
                                                                        show={effectiveShow}
                                                                    />
                                                                );
                                                            }
                                                        )}
                                                    </div>
                                                </div>
                                            ))}

                                            <div className="h-2" />

                                            {["C", "D"].map((row) => (
                                                <div
                                                    key={row}
                                                    className="flex items-center justify-center"
                                                >
                                                    <div className="flex gap-2">
                                                        {Array.from(
                                                            { length: 4 },
                                                            (_, index) => {
                                                                const seat = `${row}${index + 1}`;
                                                                return (
                                                                    <SeatButton
                                                                        key={seat}
                                                                        seat={seat}
                                                                        occupied={isSeatOccupied(seat)}
                                                                        selected={selectedSeats.includes(seat)}
                                                                        onClick={handleSeatClick}
                                                                        show={effectiveShow}
                                                                    />
                                                                );
                                                            }
                                                        )}
                                                    </div>
                                                    <div className="w-12 sm:w-16" />
                                                    <div className="flex gap-2">
                                                        {Array.from(
                                                            { length: 5 },
                                                            (_, index) => {
                                                                const seatNumber = index + 5;
                                                                const seat = `${row}${seatNumber}`;
                                                                return (
                                                                    <SeatButton
                                                                        key={seat}
                                                                        seat={seat}
                                                                        occupied={isSeatOccupied(seat)}
                                                                        selected={selectedSeats.includes(seat)}
                                                                        onClick={handleSeatClick}
                                                                        show={effectiveShow}
                                                                    />
                                                                );
                                                            }
                                                        )}
                                                    </div>
                                                </div>
                                            ))}

                                            <div className="h-4" />

                                            {/* REGULAR - MIDDLE */}
                                            <div className="w-full flex justify-start pl-4">
                                                <span
                                                    className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                                                        SEAT_TYPE_CONFIG
                                                            .REGULAR.chip
                                                    }`}
                                                >
                                                    REGULAR • MIDDLE • base • Rs.{" "}
                                                    {currentPrices.REGULAR}
                                                </span>
                                            </div>

                                            {["E", "F", "G", "H"].map((row) => (
                                                <div
                                                    key={row}
                                                    className="flex items-center justify-center"
                                                >
                                                    <div className="flex gap-2">
                                                        {Array.from(
                                                            { length: 4 },
                                                            (_, index) => {
                                                                const seat = `${row}${index + 1}`;
                                                                return (
                                                                    <SeatButton
                                                                        key={seat}
                                                                        seat={seat}
                                                                        occupied={isSeatOccupied(seat)}
                                                                        selected={selectedSeats.includes(seat)}
                                                                        onClick={handleSeatClick}
                                                                        show={effectiveShow}
                                                                    />
                                                                );
                                                            }
                                                        )}
                                                    </div>
                                                    <div className="w-12 sm:w-16" />
                                                    <div className="flex gap-2">
                                                        {Array.from(
                                                            { length: 5 },
                                                            (_, index) => {
                                                                const seatNumber = index + 5;
                                                                const seat = `${row}${seatNumber}`;
                                                                return (
                                                                    <SeatButton
                                                                        key={seat}
                                                                        seat={seat}
                                                                        occupied={isSeatOccupied(seat)}
                                                                        selected={selectedSeats.includes(seat)}
                                                                        onClick={handleSeatClick}
                                                                        show={effectiveShow}
                                                                    />
                                                                );
                                                            }
                                                        )}
                                                    </div>
                                                </div>
                                            ))}

                                            <div className="h-4" />

                                            {/* PREMIUM - BACK */}
                                            <div className="w-full flex justify-start pl-4">
                                                <span
                                                    className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                                                        SEAT_TYPE_CONFIG
                                                            .PREMIUM.chip
                                                    }`}
                                                >
                                                    PREMIUM • BACK (END) • +15% •
                                                    Rs. {currentPrices.PREMIUM}
                                                </span>
                                            </div>

                                            {["I", "J"].map((row) => (
                                                <div
                                                    key={row}
                                                    className="flex items-center justify-center"
                                                >
                                                    <div className="flex gap-2">
                                                        {Array.from(
                                                            { length: 4 },
                                                            (_, index) => {
                                                                const seat = `${row}${index + 1}`;
                                                                return (
                                                                    <SeatButton
                                                                        key={seat}
                                                                        seat={seat}
                                                                        occupied={isSeatOccupied(seat)}
                                                                        selected={selectedSeats.includes(seat)}
                                                                        onClick={handleSeatClick}
                                                                        show={effectiveShow}
                                                                    />
                                                                );
                                                            }
                                                        )}
                                                    </div>
                                                    <div className="w-12 sm:w-16" />
                                                    <div className="flex gap-2">
                                                        {Array.from(
                                                            { length: 5 },
                                                            (_, index) => {
                                                                const seatNumber = index + 5;
                                                                const seat = `${row}${seatNumber}`;
                                                                return (
                                                                    <SeatButton
                                                                        key={seat}
                                                                        seat={seat}
                                                                        occupied={isSeatOccupied(seat)}
                                                                        selected={selectedSeats.includes(seat)}
                                                                        onClick={handleSeatClick}
                                                                        show={effectiveShow}
                                                                    />
                                                                );
                                                            }
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* LEGEND */}
                                    <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-3 mt-12 text-sm text-gray-400">
                                        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
                                            {availableTypes.map((type) => {
                                                const config =
                                                    SEAT_TYPE_CONFIG[type];
                                                if (!config) return null;
                                                return (
                                                    <div
                                                        key={type}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <span
                                                            className={`w-4 h-4 rounded-full ${config.dot} border ${config.border}`}
                                                        />
                                                        <span className="font-medium text-white">
                                                            {config.label}
                                                        </span>
                                                        <span className="text-xs text-gray-400">
                                                            Rs.{" "}
                                                            {
                                                                currentPrices[
                                                                    type
                                                                ]
                                                            }
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <span className="text-gray-600">|</span>

                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <span className="w-4 h-4 rounded border border-gray-700 bg-transparent" />
                                                <span>Available</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="w-4 h-4 rounded bg-primary" />
                                                <span>Selected</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="w-4 h-4 rounded bg-gray-700" />
                                                <span>Occupied</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </section>
                    </div>

                    {/* CHECKOUT */}
                    <div className="border-t border-gray-800 mt-14 pt-8">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                            <div>
                                <p className="text-gray-400 text-sm">
                                    Your selected seats
                                </p>
                                <p className="font-semibold mt-1 text-base">
                                    {selectedSeats.length > 0
                                        ? selectedSeats.join(", ")
                                        : "No seats selected"}
                                </p>

                                {seatBreakdown.length > 0 && (
                                    <div className="mt-3 space-y-1">
                                        {seatBreakdown.map((item) => {
                                            const config =
                                                SEAT_TYPE_CONFIG[item.type];
                                            const diff =
                                                config.percentage - 100;
                                            const diffLabel =
                                                diff === 0
                                                    ? "base"
                                                    : diff > 0
                                                    ? `+${diff}%`
                                                    : `${diff}%`;
                                            return (
                                                <p
                                                    key={item.type}
                                                    className="text-xs text-gray-400 flex items-center gap-2"
                                                >
                                                    <span
                                                        className={`w-2 h-2 rounded-full ${config.dot}`}
                                                    />
                                                    <span className="text-gray-300 font-medium">
                                                        {config.label}
                                                    </span>
                                                    <span className="text-gray-500">
                                                        ({diffLabel})
                                                    </span>
                                                    <span>
                                                        Rs. {item.unitPrice} ×{" "}
                                                        {item.count}
                                                    </span>
                                                    <span className="text-gray-500">
                                                        =
                                                    </span>
                                                    <span className="text-white">
                                                        Rs. {item.subtotal}
                                                    </span>
                                                </p>
                                            );
                                        })}
                                    </div>
                                )}

                                {selectedTime && occupiedSeats.length > 0 && (
                                    <p className="text-xs text-gray-500 mt-2">
                                        <span className="text-gray-400">
                                            Already booked:
                                        </span>{" "}
                                        {occupiedSeats.slice(0, 10).join(", ")}
                                        {occupiedSeats.length > 10
                                            ? ` +${occupiedSeats.length - 10} more`
                                            : ""}
                                    </p>
                                )}

                                {selectedTime && (
                                    <p className="text-gray-400 text-sm mt-2">
                                        Time:{" "}
                                        {formatTime(selectedTime.showDateTime)}
                                    </p>
                                )}

                                {resolvedTheater?.name && (
                                    <p className="text-gray-400 text-sm mt-1 flex items-center gap-1.5">
                                        <MapPinIcon className="w-3.5 h-3.5 text-primary" />
                                        <span className="text-primary font-medium">
                                            {resolvedTheater.name}
                                        </span>
                                        {resolvedTheater.city && (
                                            <span>, {resolvedTheater.city}</span>
                                        )}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                                <div className="text-left sm:text-right">
                                    <p className="text-gray-400 text-sm">
                                        Total
                                    </p>
                                    <p className="text-2xl font-bold">
                                        Rs. {totalAmount}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleCheckout}
                                    disabled={
                                        bookingLoading ||
                                        !selectedTime ||
                                        selectedSeats.length === 0
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