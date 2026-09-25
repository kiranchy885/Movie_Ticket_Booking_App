import React, {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
} from "recharts";

import {
    CalendarDays,
    CircleDollarSign,
    Ticket,
    Armchair,
    CheckCircle2,
    Clock3,
    Activity,
    RefreshCw,
} from "lucide-react";

import { io } from "socket.io-client";

// =====================================================
// API
// =====================================================

const API_BASE =
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000/api";

const SOCKET_URL =
    API_BASE.replace("/api", "");

// =====================================================
// COLORS
// =====================================================

const COLORS = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff7300",
    "#0088FE",
    "#00C49F",
];

const STATUS_COLORS = [
    "#4ade80",
    "#facc15",
];

// =====================================================
// EMPTY DATA
// =====================================================

const EMPTY_DATA = {
    summary: {
        totalBookings: 0,
        paidBookings: 0,
        pendingBookings: 0,
        totalRevenue: 0,
        totalSeats: 0,
        todayBookings: 0,
        todayRevenue: 0,
        todaySeats: 0,
    },

    bookingTrend: [],
    movies: [],
    showtimes: [],
    bookingStatus: [],
    recentBookings: [],
};

// =====================================================
// FORMAT CURRENCY
// =====================================================

const formatCurrency = (amount) => {
    return `Rs. ${Number(
        amount || 0
    ).toLocaleString()}`;
};

// =====================================================
// FORMAT DATE
// =====================================================

const formatDateTime = (
    date
) => {
    if (!date) {
        return "-";
    }

    const parsedDate =
        new Date(date);

    if (
        Number.isNaN(
            parsedDate.getTime()
        )
    ) {
        return "-";
    }

    return parsedDate.toLocaleString();
};

// =====================================================
// STAT CARD
// =====================================================

const StatCard = ({
    title,
    value,
    subtitle,
    icon,
}) => {
    return (
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-lg">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-gray-400 text-sm">
                        {title}
                    </p>

                    <h3 className="text-2xl font-bold text-white mt-2">
                        {value}
                    </h3>

                    <p className="text-gray-500 text-xs mt-2">
                        {subtitle}
                    </p>
                </div>

                <div className="bg-gray-700 p-3 rounded-lg">
                    {icon}
                </div>
            </div>
        </div>
    );
};

// =====================================================
// RESULT ANALYSIS
// =====================================================

const ResultAnalysis =
    () => {
        const [
            analytics,
            setAnalytics,
        ] = useState(
            EMPTY_DATA
        );

        const [
            startDate,
            setStartDate,
        ] = useState(() => {
            const date =
                new Date();

            date.setDate(
                date.getDate() -
                    6
            );

            return date
                .toISOString()
                .split("T")[0];
        });

        const [
            endDate,
            setEndDate,
        ] = useState(
            new Date()
                .toISOString()
                .split("T")[0]
        );

        const [
            loading,
            setLoading,
        ] = useState(true);

        const [
            refreshing,
            setRefreshing,
        ] = useState(false);

        const [
            error,
            setError,
        ] = useState("");

        const [
            isLive,
            setIsLive,
        ] = useState(false);

        const [
            lastUpdated,
            setLastUpdated,
        ] = useState(null);

        // =================================================
        // FETCH DASHBOARD
        // =================================================

        const fetchAnalytics =
            useCallback(
                async (
                    showRefresh = false
                ) => {
                    try {
                        if (
                            showRefresh
                        ) {
                            setRefreshing(
                                true
                            );
                        } else {
                            setLoading(
                                true
                            );
                        }

                        setError(
                            ""
                        );

                        const query =
                            `?from=${startDate}&to=${endDate}`;

                        const response =
                            await fetch(
                                `${API_BASE}/analytics/dashboard${query}`
                            );

                        if (
                            !response.ok
                        ) {
                            throw new Error(
                                `Analytics request failed: ${response.status}`
                            );
                        }

                        const result =
                            await response.json();

                        if (
                            !result.success
                        ) {
                            throw new Error(
                                result.message ||
                                    "Failed to load analytics"
                            );
                        }

                        setAnalytics(
                            result.data ||
                                EMPTY_DATA
                        );

                        setLastUpdated(
                            new Date()
                        );
                    } catch (err) {
                        console.error(
                            "Analytics error:",
                            err
                        );

                        setError(
                            err.message ||
                                "Failed to load analytics"
                        );
                    } finally {
                        setLoading(
                            false
                        );

                        setRefreshing(
                            false
                        );
                    }
                },
                [
                    startDate,
                    endDate,
                ]
            );

        // =================================================
        // INITIAL LOAD
        // =================================================

        useEffect(() => {
            fetchAnalytics();
        }, [
            fetchAnalytics,
        ]);

        // =================================================
        // REAL-TIME SOCKET
        // =================================================

        useEffect(() => {
            const socket =
                io(
                    SOCKET_URL,
                    {
                        transports: [
                            "websocket",
                            "polling",
                        ],
                    }
                );

            socket.on(
                "connect",
                () => {
                    console.log(
                        "📡 Analytics socket connected:",
                        socket.id
                    );

                    setIsLive(
                        true
                    );
                }
            );

            socket.on(
                "disconnect",
                () => {
                    console.log(
                        "📡 Analytics socket disconnected"
                    );

                    setIsLive(
                        false
                    );
                }
            );

            socket.on(
                "analyticsUpdated",
                (event) => {
                    console.log(
                        "📊 LIVE ANALYTICS EVENT:",
                        event
                    );

                    fetchAnalytics(
                        true
                    );
                }
            );

            return () => {
                socket.disconnect();
            };
        }, [
            fetchAnalytics,
        ]);

        // =================================================
        // DATE BUTTONS
        // =================================================

        const setToday =
            () => {
                const today =
                    new Date()
                        .toISOString()
                        .split(
                            "T"
                        )[0];

                setStartDate(
                    today
                );

                setEndDate(
                    today
                );
            };

        const setLast7Days =
            () => {
                const end =
                    new Date();

                const start =
                    new Date();

                start.setDate(
                    start.getDate() -
                        6
                );

                setStartDate(
                    start
                        .toISOString()
                        .split(
                            "T"
                        )[0]
                );

                setEndDate(
                    end
                        .toISOString()
                        .split(
                            "T"
                        )[0]
                );
            };

        const setLast30Days =
            () => {
                const end =
                    new Date();

                const start =
                    new Date();

                start.setDate(
                    start.getDate() -
                        29
                );

                setStartDate(
                    start
                        .toISOString()
                        .split(
                            "T"
                        )[0]
                );

                setEndDate(
                    end
                        .toISOString()
                        .split(
                            "T"
                        )[0]
                );
            };

        // =================================================
        // DATA
        // =================================================

        const summary =
            analytics.summary ||
            EMPTY_DATA.summary;

        const bookingTrend =
            analytics.bookingTrend ||
            [];

        const movies =
            analytics.movies ||
            [];

        const showtimes =
            analytics.showtimes ||
            [];

        const bookingStatus =
            analytics.bookingStatus ||
            [];

        const recentBookings =
            analytics.recentBookings ||
            [];

        // =================================================
        // LOADING
        // =================================================

        if (
            loading &&
            !lastUpdated
        ) {
            return (
                <div className="min-h-screen bg-black flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <Activity
                            size={36}
                            className="text-primary animate-pulse"
                        />

                        <p className="text-white">
                            Loading live analytics...
                        </p>
                    </div>
                </div>
            );
        }

        // =================================================
        // PAGE
        // =================================================

        return (
            <div className="p-6 space-y-8 bg-black text-white min-h-screen">

                {/* HEADER */}

                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">

                    <div>
                        <div className="flex items-center gap-3">

                            <h2 className="text-2xl font-bold">
                                Result Analysis
                            </h2>

                            <div className="flex items-center gap-2">

                                <span
                                    className={`w-2.5 h-2.5 rounded-full ${
                                        isLive
                                            ? "bg-green-500 animate-pulse"
                                            : "bg-red-500"
                                    }`}
                                />

                                <span
                                    className={`text-sm font-medium ${
                                        isLive
                                            ? "text-green-400"
                                            : "text-red-400"
                                    }`}
                                >
                                    {isLive
                                        ? "LIVE"
                                        : "OFFLINE"}
                                </span>

                            </div>

                        </div>

                        <p className="text-gray-400 mt-1">
                            Real-time cinema performance,
                            bookings and revenue
                        </p>

                        {lastUpdated && (
                            <p className="text-gray-500 text-xs mt-2">
                                Last updated:{" "}
                                {lastUpdated.toLocaleTimeString()}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">

                        <button
                            onClick={
                                setToday
                            }
                            className="bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg text-sm"
                        >
                            Today
                        </button>

                        <button
                            onClick={
                                setLast7Days
                            }
                            className="bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg text-sm"
                        >
                            7 Days
                        </button>

                        <button
                            onClick={
                                setLast30Days
                            }
                            className="bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg text-sm"
                        >
                            30 Days
                        </button>

                        <button
                            onClick={() =>
                                fetchAnalytics(
                                    true
                                )
                            }
                            disabled={
                                refreshing
                            }
                            className="bg-primary px-3 py-2 rounded-lg text-sm flex items-center gap-2"
                        >
                            <RefreshCw
                                size={16}
                                className={
                                    refreshing
                                        ? "animate-spin"
                                        : ""
                                }
                            />

                            Refresh
                        </button>

                    </div>
                </div>

                {/* DATE FILTER */}

                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">

                    <div className="flex flex-wrap items-center gap-4">

                        <CalendarDays
                            size={19}
                            className="text-primary"
                        />

                        <label className="text-gray-300">
                            From
                        </label>

                        <input
                            type="date"
                            value={
                                startDate
                            }
                            onChange={(e) =>
                                setStartDate(
                                    e.target
                                        .value
                                )
                            }
                            className="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600"
                        />

                        <label className="text-gray-300">
                            To
                        </label>

                        <input
                            type="date"
                            value={
                                endDate
                            }
                            onChange={(e) =>
                                setEndDate(
                                    e.target
                                        .value
                                )
                            }
                            className="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600"
                        />

                    </div>
                </div>

                {/* KPI */}

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">

                    <StatCard
                        title="Total Bookings"
                        value={
                            summary.totalBookings
                        }
                        subtitle={`${summary.todayBookings} bookings today`}
                        icon={
                            <Ticket
                                size={22}
                                className="text-primary"
                            />
                        }
                    />

                    <StatCard
                        title="Total Revenue"
                        value={formatCurrency(
                            summary.totalRevenue
                        )}
                        subtitle={`${formatCurrency(
                            summary.todayRevenue
                        )} today`}
                        icon={
                            <CircleDollarSign
                                size={22}
                                className="text-green-400"
                            />
                        }
                    />

                    <StatCard
                        title="Seats Sold"
                        value={
                            summary.totalSeats
                        }
                        subtitle={`${summary.todaySeats} seats today`}
                        icon={
                            <Armchair
                                size={22}
                                className="text-blue-400"
                            />
                        }
                    />

                    <StatCard
                        title="Paid Bookings"
                        value={
                            summary.paidBookings
                        }
                        subtitle={`${summary.pendingBookings} unpaid`}
                        icon={
                            <CheckCircle2
                                size={22}
                                className="text-green-400"
                            />
                        }
                    />

                </div>

                {/* BOOKING + REVENUE */}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">

                        <h3 className="text-lg font-semibold mb-4">
                            Booking Trend
                        </h3>

                        {bookingTrend.length ===
                        0 ? (
                            <p className="text-gray-400">
                                No booking data
                            </p>
                        ) : (
                            <ResponsiveContainer
                                width="100%"
                                height={320}
                            >
                                <LineChart
                                    data={
                                        bookingTrend
                                    }
                                >

                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="#444"
                                    />

                                    <XAxis
                                        dataKey="date"
                                        stroke="#aaa"
                                    />

                                    <YAxis
                                        stroke="#aaa"
                                    />

                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor:
                                                "#1f2937",
                                            border: "none",
                                        }}
                                    />

                                    <Legend />

                                    <Line
                                        type="monotone"
                                        dataKey="bookings"
                                        stroke="#8884d8"
                                        strokeWidth={3}
                                        name="Bookings"
                                    />

                                    <Line
                                        type="monotone"
                                        dataKey="paidBookings"
                                        stroke="#4ade80"
                                        strokeWidth={3}
                                        name="Paid"
                                    />

                                </LineChart>
                            </ResponsiveContainer>
                        )}

                    </div>

                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">

                        <h3 className="text-lg font-semibold mb-4">
                            Revenue Trend
                        </h3>

                        {bookingTrend.length ===
                        0 ? (
                            <p className="text-gray-400">
                                No revenue data
                            </p>
                        ) : (
                            <ResponsiveContainer
                                width="100%"
                                height={320}
                            >
                                <BarChart
                                    data={
                                        bookingTrend
                                    }
                                >

                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="#444"
                                    />

                                    <XAxis
                                        dataKey="date"
                                        stroke="#aaa"
                                    />

                                    <YAxis
                                        stroke="#aaa"
                                    />

                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor:
                                                "#1f2937",
                                            border: "none",
                                        }}
                                    />

                                    <Legend />

                                    <Bar
                                        dataKey="revenue"
                                        fill="#82ca9d"
                                        name="Revenue"
                                    />

                                </BarChart>
                            </ResponsiveContainer>
                        )}

                    </div>

                </div>

                {/* MOVIES + SHOWTIMES */}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">

                        <h3 className="text-lg font-semibold mb-4">
                            Top Movies
                        </h3>

                        {movies.length ===
                        0 ? (
                            <p className="text-gray-400">
                                No movie data
                            </p>
                        ) : (
                            <ResponsiveContainer
                                width="100%"
                                height={320}
                            >
                                <BarChart
                                    data={movies.slice(
                                        0,
                                        8
                                    )}
                                    layout="vertical"
                                >

                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="#444"
                                    />

                                    <XAxis
                                        type="number"
                                        stroke="#aaa"
                                    />

                                    <YAxis
                                        type="category"
                                        dataKey="movie"
                                        width={110}
                                        stroke="#aaa"
                                    />

                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor:
                                                "#1f2937",
                                            border: "none",
                                        }}
                                    />

                                    <Bar
                                        dataKey="bookings"
                                        fill="#8884d8"
                                        name="Bookings"
                                    />

                                </BarChart>
                            </ResponsiveContainer>
                        )}

                    </div>

                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">

                        <h3 className="text-lg font-semibold mb-4">
                            Bookings by Show Time
                        </h3>

                        {showtimes.length ===
                        0 ? (
                            <p className="text-gray-400">
                                No show-time data
                            </p>
                        ) : (
                            <ResponsiveContainer
                                width="100%"
                                height={320}
                            >
                                <BarChart
                                    data={
                                        showtimes
                                    }
                                >

                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="#444"
                                    />

                                    <XAxis
                                        dataKey="time"
                                        stroke="#aaa"
                                    />

                                    <YAxis
                                        stroke="#aaa"
                                    />

                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor:
                                                "#1f2937",
                                            border: "none",
                                        }}
                                    />

                                    <Legend />

                                    <Bar
                                        dataKey="bookings"
                                        fill="#ffc658"
                                        name="Bookings"
                                    />

                                    <Bar
                                        dataKey="seats"
                                        fill="#ff7300"
                                        name="Seats"
                                    />

                                </BarChart>
                            </ResponsiveContainer>
                        )}

                    </div>

                </div>

                {/* STATUS + TODAY */}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">

                        <h3 className="text-lg font-semibold mb-4">
                            Booking Payment Status
                        </h3>

                        {bookingStatus.length ===
                        0 ? (
                            <p className="text-gray-400">
                                No status data
                            </p>
                        ) : (
                            <ResponsiveContainer
                                width="100%"
                                height={320}
                            >
                                <PieChart>

                                    <Pie
                                        data={
                                            bookingStatus
                                        }
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        dataKey="value"
                                        nameKey="name"
                                        label={({
                                            name,
                                            percent,
                                        }) =>
                                            `${name} ${(
                                                percent *
                                                100
                                            ).toFixed(
                                                0
                                            )}%`
                                        }
                                    >

                                        {bookingStatus.map(
                                            (
                                                entry,
                                                index
                                            ) => (
                                                <Cell
                                                    key={
                                                        entry.name
                                                    }
                                                    fill={
                                                        STATUS_COLORS[
                                                            index %
                                                                STATUS_COLORS.length
                                                        ]
                                                    }
                                                />
                                            )
                                        )}

                                    </Pie>

                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor:
                                                "#1f2937",
                                            border: "none",
                                        }}
                                    />

                                    <Legend />

                                </PieChart>
                            </ResponsiveContainer>
                        )}

                    </div>

                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">

                        <h3 className="text-lg font-semibold mb-5">
                            Today's Performance
                        </h3>

                        <div className="space-y-4">

                            <div className="bg-gray-700 p-4 rounded-lg flex items-center justify-between">

                                <div className="flex items-center gap-3">

                                    <Ticket
                                        size={20}
                                        className="text-primary"
                                    />

                                    <span className="text-gray-300">
                                        Bookings
                                    </span>

                                </div>

                                <span className="font-bold text-white">
                                    {
                                        summary.todayBookings
                                    }
                                </span>

                            </div>

                            <div className="bg-gray-700 p-4 rounded-lg flex items-center justify-between">

                                <div className="flex items-center gap-3">

                                    <CircleDollarSign
                                        size={20}
                                        className="text-green-400"
                                    />

                                    <span className="text-gray-300">
                                        Revenue
                                    </span>

                                </div>

                                <span className="font-bold text-white">
                                    {formatCurrency(
                                        summary.todayRevenue
                                    )}
                                </span>

                            </div>

                            <div className="bg-gray-700 p-4 rounded-lg flex items-center justify-between">

                                <div className="flex items-center gap-3">

                                    <Armchair
                                        size={20}
                                        className="text-blue-400"
                                    />

                                    <span className="text-gray-300">
                                        Seats
                                    </span>

                                </div>

                                <span className="font-bold text-white">
                                    {
                                        summary.todaySeats
                                    }
                                </span>

                            </div>

                            <div className="bg-gray-700 p-4 rounded-lg flex items-center justify-between">

                                <div className="flex items-center gap-3">

                                    <Clock3
                                        size={20}
                                        className="text-yellow-400"
                                    />

                                    <span className="text-gray-300">
                                        Pending
                                    </span>

                                </div>

                                <span className="font-bold text-white">
                                    {
                                        summary.pendingBookings
                                    }
                                </span>

                            </div>

                        </div>
                    </div>

                </div>

                {/* RECENT BOOKINGS */}

                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">

                    <div className="flex items-center justify-between mb-5">

                        <h3 className="text-lg font-semibold">
                            Recent Bookings
                        </h3>

                        <div className="flex items-center gap-2">

                            <span
                                className={`w-2 h-2 rounded-full ${
                                    isLive
                                        ? "bg-green-500"
                                        : "bg-red-500"
                                }`}
                            />

                            <span className="text-xs text-gray-400">
                                Live
                            </span>

                        </div>

                    </div>

                    {recentBookings.length ===
                    0 ? (
                        <p className="text-gray-400">
                            No recent bookings
                        </p>
                    ) : (
                        <div className="overflow-x-auto">

                            <table className="w-full text-sm">

                                <thead>

                                    <tr className="border-b border-gray-700 text-gray-400">

                                        <th className="text-left py-3 px-2">
                                            Movie
                                        </th>

                                        <th className="text-left py-3 px-2">
                                            Seats
                                        </th>

                                        <th className="text-left py-3 px-2">
                                            Show Time
                                        </th>

                                        <th className="text-left py-3 px-2">
                                            Amount
                                        </th>

                                        <th className="text-left py-3 px-2">
                                            Status
                                        </th>

                                        <th className="text-left py-3 px-2">
                                            Booked At
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {recentBookings.map(
                                        (
                                            booking
                                        ) => (
                                            <tr
                                                key={
                                                    booking._id
                                                }
                                                className="border-b border-gray-700/50"
                                            >

                                                <td className="py-3 px-2 font-medium text-white">
                                                    {
                                                        booking.movieName
                                                    }
                                                </td>

                                                <td className="py-3 px-2 text-gray-300">
                                                    {booking.seats?.join(
                                                        ", "
                                                    ) ||
                                                        "-"}
                                                </td>

                                                <td className="py-3 px-2 text-gray-300">
                                                    {formatDateTime(
                                                        booking.showDateTime
                                                    )}
                                                </td>

                                                <td className="py-3 px-2 text-white">
                                                    {formatCurrency(
                                                        booking.amount
                                                    )}
                                                </td>

                                                <td className="py-3 px-2">

                                                    <span
                                                        className={`px-2.5 py-1 rounded-full text-xs ${
                                                            booking.isPaid
                                                                ? "bg-green-500/20 text-green-400"
                                                                : "bg-yellow-500/20 text-yellow-400"
                                                        }`}
                                                    >
                                                        {booking.isPaid
                                                            ? "Paid"
                                                            : "Unpaid"}
                                                    </span>

                                                </td>

                                                <td className="py-3 px-2 text-gray-400">
                                                    {formatDateTime(
                                                        booking.createdAt
                                                    )}
                                                </td>

                                            </tr>
                                        )
                                    )}

                                </tbody>

                            </table>

                        </div>
                    )}

                </div>

                {/* ERROR */}

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
                        {error}
                    </div>
                )}

            </div>
        );
    };

export default ResultAnalysis;