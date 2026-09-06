import React, { useEffect, useState } from "react";
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

// =====================================================
// API BASE URL
// =====================================================

const API_BASE =
    import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// =====================================================
// CHART COLORS
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
    "#f87171",
    "#60a5fa",
];

// =====================================================
// RESULT ANALYSIS
// =====================================================

const ResultAnalysis = () => {
    const [dailyData, setDailyData] = useState([]);
    const [movieData, setMovieData] = useState([]);
    const [showtimeData, setShowtimeData] = useState([]);
    const [statusData, setStatusData] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // =================================================
    // DATE RANGE
    // =================================================

    const [startDate, setStartDate] = useState(
        new Date(
            Date.now() - 6 * 24 * 60 * 60 * 1000
        )
            .toISOString()
            .split("T")[0]
    );

    const [endDate, setEndDate] = useState(
        new Date().toISOString().split("T")[0]
    );

    // =================================================
    // FETCH ANALYTICS
    // =================================================

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError("");

            const query = `?from=${startDate}&to=${endDate}`;

            console.log("Fetching analytics...");
            console.log("API Base:", API_BASE);

            const [
                dailyRes,
                moviesRes,
                showtimesRes,
                statusRes,
            ] = await Promise.all([
                fetch(`${API_BASE}/analytics/daily${query}`),
                fetch(`${API_BASE}/analytics/movies`),
                fetch(`${API_BASE}/analytics/showtimes`),
                fetch(`${API_BASE}/analytics/status`),
            ]);

            // =============================================
            // CHECK RESPONSE STATUS
            // =============================================

            if (!dailyRes.ok) {
                throw new Error(
                    `Daily analytics failed: ${dailyRes.status}`
                );
            }

            if (!moviesRes.ok) {
                throw new Error(
                    `Movie analytics failed: ${moviesRes.status}`
                );
            }

            if (!showtimesRes.ok) {
                throw new Error(
                    `Showtime analytics failed: ${showtimesRes.status}`
                );
            }

            if (!statusRes.ok) {
                throw new Error(
                    `Status analytics failed: ${statusRes.status}`
                );
            }

            // =============================================
            // CONVERT RESPONSE TO JSON
            // =============================================

            const daily = await dailyRes.json();
            const movies = await moviesRes.json();
            const showtimes = await showtimesRes.json();
            const status = await statusRes.json();

            console.log("Daily analytics:", daily);
            console.log("Movie analytics:", movies);
            console.log("Showtime analytics:", showtimes);
            console.log("Status analytics:", status);

            // =============================================
            // SET DATA
            // Backend returns:
            //
            // {
            //    success: true,
            //    data: [...]
            // }
            // =============================================

            setDailyData(
                Array.isArray(daily.data)
                    ? daily.data
                    : []
            );

            setMovieData(
                Array.isArray(movies.data)
                    ? movies.data
                    : []
            );

            // =============================================
            // CONVERT SHOWTIME DATA
            // =============================================

            const formattedShowtimes =
                Array.isArray(showtimes.data)
                    ? showtimes.data.map((item) => ({
                          name: item.movie || "Unknown",
                          value: Number(
                              item.occupiedSeats || 0
                          ),
                      }))
                    : [];

            setShowtimeData(formattedShowtimes);

            // =============================================
            // CONVERT STATUS DATA
            // =============================================

            const formattedStatus =
                Array.isArray(status.data)
                    ? status.data.map((item) => ({
                          name: item.status || "Unknown",
                          value: Number(item.count || 0),
                      }))
                    : [];

            setStatusData(formattedStatus);
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
            setLoading(false);
        }
    };

    // =================================================
    // LOAD ANALYTICS
    // =================================================

    useEffect(() => {
        fetchAnalytics();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate]);

    // =================================================
    // CALCULATE SUMMARY
    // =================================================

    const totalBookings = dailyData.reduce(
        (total, item) =>
            total + Number(item.bookings || 0),
        0
    );

    const totalRevenue = dailyData.reduce(
        (total, item) =>
            total + Number(item.revenue || 0),
        0
    );

    const totalMovieBookings = movieData.reduce(
        (total, item) =>
            total + Number(item.bookings || 0),
        0
    );

    const totalSeats = movieData.reduce(
        (total, item) =>
            total + Number(item.seats || 0),
        0
    );

    // =================================================
    // LOADING
    // =================================================

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="text-white text-lg">
                    Loading analytics...
                </div>
            </div>
        );
    }

    // =================================================
    // ERROR
    // =================================================

    if (error) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="bg-gray-800 p-8 rounded-xl text-center">
                    <h2 className="text-xl font-bold text-red-500 mb-3">
                        Analytics Error
                    </h2>

                    <p className="text-gray-300 mb-5">
                        {error}
                    </p>

                    <button
                        onClick={fetchAnalytics}
                        className="bg-primary px-5 py-2 rounded-lg text-white"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // =================================================
    // UI
    // =================================================

    return (
        <div className="p-6 space-y-8 bg-black text-white min-h-screen">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="flex flex-wrap items-center justify-between gap-4">

                <div>
                    <h2 className="text-2xl font-bold">
                        Result Analysis
                    </h2>

                    <p className="text-gray-400 mt-1">
                        Analyze bookings, movies, showtimes
                        and revenue
                    </p>
                </div>

                {/* DATE FILTER */}

                <div className="flex flex-wrap items-center gap-4 bg-gray-800 p-4 rounded-xl">

                    <label className="text-gray-300">
                        From:
                    </label>

                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) =>
                            setStartDate(
                                e.target.value
                            )
                        }
                        className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                    />

                    <label className="text-gray-300">
                        To:
                    </label>

                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) =>
                            setEndDate(
                                e.target.value
                            )
                        }
                        className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                    />

                </div>
            </div>

            
            {/* =================================================
                CHART GRID
            ================================================= */}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* =================================================
                    DAILY BOOKINGS
                ================================================= */}

                <div className="bg-gray-800 p-6 rounded-xl shadow-lg">

                    <h3 className="text-lg font-semibold text-gray-200 mb-4">
                        Daily Bookings
                    </h3>

                    {dailyData.length === 0 ? (
                        <p className="text-gray-400">
                            No data for selected period
                        </p>
                    ) : (
                        <ResponsiveContainer
                            width="100%"
                            height={300}
                        >
                            <LineChart
                                data={dailyData}
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
                                    stroke="#82ca9d"
                                    strokeWidth={3}
                                />

                            </LineChart>
                        </ResponsiveContainer>
                    )}

                </div>

                {/* =================================================
                    BOOKINGS PER MOVIE
                ================================================= */}

                <div className="bg-gray-800 p-6 rounded-xl shadow-lg">

                    <h3 className="text-lg font-semibold text-gray-200 mb-4">
                        Bookings per Movie
                    </h3>

                    {movieData.length === 0 ? (
                        <p className="text-gray-400">
                            No movie data
                        </p>
                    ) : (
                        <ResponsiveContainer
                            width="100%"
                            height={300}
                        >
                            <BarChart
                                data={movieData}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#444"
                                />

                                <XAxis
                                    dataKey="movie"
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
                                    fill="#8884d8"
                                />

                            </BarChart>
                        </ResponsiveContainer>
                    )}

                </div>

                {/* =================================================
                    SHOWTIME DISTRIBUTION
                ================================================= */}

                <div className="bg-gray-800 p-6 rounded-xl shadow-lg">

                    <h3 className="text-lg font-semibold text-gray-200 mb-4">
                        Bookings by Show Time
                    </h3>

                    {showtimeData.length === 0 ? (
                        <p className="text-gray-400">
                            No show-time data
                        </p>
                    ) : (
                        <ResponsiveContainer
                            width="100%"
                            height={300}
                        >
                            <PieChart>

                                <Pie
                                    data={showtimeData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({
                                        name,
                                        percent,
                                    }) =>
                                        `${name} ${(
                                            percent * 100
                                        ).toFixed(0)}%`
                                    }
                                    outerRadius={100}
                                    dataKey="value"
                                >

                                    {showtimeData.map(
                                        (
                                            entry,
                                            index
                                        ) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={
                                                    COLORS[
                                                        index %
                                                            COLORS.length
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

                            </PieChart>
                        </ResponsiveContainer>
                    )}

                </div>

                {/* =================================================
                    BOOKING STATUS
                ================================================= */}

                <div className="bg-gray-800 p-6 rounded-xl shadow-lg">

                    <h3 className="text-lg font-semibold text-gray-200 mb-4">
                        Booking Status
                    </h3>

                    {statusData.length === 0 ? (
                        <p className="text-gray-400">
                            No status data
                        </p>
                    ) : (
                        <ResponsiveContainer
                            width="100%"
                            height={300}
                        >
                            <PieChart>

                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({
                                        name,
                                        percent,
                                    }) =>
                                        `${name} ${(
                                            percent * 100
                                        ).toFixed(0)}%`
                                    }
                                    outerRadius={100}
                                    dataKey="value"
                                >

                                    {statusData.map(
                                        (
                                            entry,
                                            index
                                        ) => (
                                            <Cell
                                                key={`cell-${index}`}
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

                            </PieChart>
                        </ResponsiveContainer>
                    )}

                </div>

            </div>

        </div>
    );
};

export default ResultAnalysis;