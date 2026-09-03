import React, { useEffect, useState } from "react";

import Title from "../../components/admin/Title";
import Loading from "../../components/Loading";
import BlurCircle from "../../components/BlurCircle";

import {
    ChartLineIcon,
    CircleDollarSignIcon,
    PlayCircleIcon,
    UsersIcon,
    StarIcon,
    ShieldCheckIcon
} from "lucide-react";

import { dateFormat } from "../../lib/dateFormat";

const Dashboard = () => {

    const currency =
        import.meta.env.VITE_CURRENCY || "Rs.";

    const [dashboardData, setDashboardData] = useState({
        totalBookings: 0,
        totalRevenue: 0,
        activeShows: [],
        totalUser: 0,
        totalAdmin: 0,
    });

    const [loading, setLoading] = useState(true);

    // =====================================================
    // FETCH DASHBOARD DATA
    // =====================================================

    const fetchDashboardData = async () => {

        try {

            const token =
                localStorage.getItem("token");

            // =================================================
            // DASHBOARD DATA
            // USERS + ADMINS + BOOKINGS + REVENUE
            // =================================================

            const dashboardResponse =
                await fetch(
                    "http://localhost:3000/admin/dashboard",
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                        },
                    }
                );

            const dashboardResult =
                await dashboardResponse.json();

            console.log(
                "Dashboard Result:",
                dashboardResult
            );

            // =================================================
            // ACTIVE SHOWS
            // KEEPING YOUR EXISTING SHOW FETCH
            // =================================================

            const showsResponse =
                await fetch(
                    "http://localhost:3000/show/all",
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                        },
                    }
                );

            const showsData =
                await showsResponse.json();

            let activeShows = [];

            if (showsData.success) {

                const now = new Date();

                activeShows =
                    showsData.shows.filter(
                        show =>
                            new Date(
                                show.showDateTime
                            ) >= now
                    );
            }

            // =================================================
            // SET DASHBOARD DATA
            // =================================================

            if (dashboardResult.success) {

                setDashboardData({

                    // -----------------------------------------
                    // EXISTING BOOKING COUNT
                    // -----------------------------------------

                    totalBookings:
                        dashboardResult
                            .dashboardData
                            .totalBookings || 0,

                    // -----------------------------------------
                    // EXISTING REVENUE
                    // -----------------------------------------

                    totalRevenue:
                        dashboardResult
                            .dashboardData
                            .totalRevenue || 0,

                    // -----------------------------------------
                    // EXISTING ACTIVE SHOWS
                    // -----------------------------------------

                    activeShows,

                    // -----------------------------------------
                    // TOTAL NORMAL USERS
                    // FROM User COLLECTION
                    // role = "user"
                    // -----------------------------------------

                    totalUser:
                        Number(
                            dashboardResult
                                .dashboardData
                                .totalUser
                        ) || 0,

                    // -----------------------------------------
                    // TOTAL ADMINS
                    // FROM User COLLECTION
                    // role = "admin"
                    // -----------------------------------------

                    totalAdmin:
                        Number(
                            dashboardResult
                                .dashboardData
                                .totalAdmin
                        ) || 0,
                });

            } else {

                setDashboardData(prev => ({
                    ...prev,
                    activeShows
                }));

            }

        } catch (error) {

            console.error(
                "Dashboard fetch error:",
                error
            );

        } finally {

            setLoading(false);

        }
    };

    // =====================================================
    // LOAD DASHBOARD
    // =====================================================

    useEffect(() => {

        fetchDashboardData();

    }, []);

    // =====================================================
    // LOADING
    // =====================================================

    if (loading) {

        return <Loading />;

    }

    return (

        <div className="relative">

            <BlurCircle
                top="0"
                left="0"
            />

            <BlurCircle
                top="50%"
                right="0"
            />

            {/* =================================================
                TITLE
            ================================================= */}

            <div className="mb-8">

                <Title
                    text1="Admin"
                    text2="Dashboard"
                />

            </div>

            {/* =================================================
                DASHBOARD CARDS
            ================================================= */}

            <div
                className="
                    grid
                    grid-cols-1
                    sm:grid-cols-2
                    lg:grid-cols-5
                    gap-4
                    mb-10
                "
            >

                {/* =================================================
                    TOTAL BOOKINGS
                ================================================= */}

                <div
                    className="
                        bg-primary/10
                        border
                        border-primary/20
                        rounded-lg
                        p-5
                    "
                >

                    <div
                        className="
                            flex
                            items-center
                            justify-between
                        "
                    >

                        <div>

                            <p
                                className="
                                    text-gray-400
                                    text-sm
                                "
                            >
                                Total Bookings
                            </p>

                            <h2
                                className="
                                    text-2xl
                                    font-semibold
                                    mt-1
                                "
                            >
                                {
                                    dashboardData
                                        .totalBookings
                                }
                            </h2>

                        </div>

                        <ChartLineIcon
                            className="
                                w-8
                                h-8
                                text-primary
                            "
                        />

                    </div>

                </div>

                {/* =================================================
                    TOTAL REVENUE
                ================================================= */}

                <div
                    className="
                        bg-primary/10
                        border
                        border-primary/20
                        rounded-lg
                        p-5
                    "
                >

                    <div
                        className="
                            flex
                            items-center
                            justify-between
                        "
                    >

                        <div>

                            <p
                                className="
                                    text-gray-400
                                    text-sm
                                "
                            >
                                Total Revenue
                            </p>

                            <h2
                                className="
                                    text-2xl
                                    font-semibold
                                    mt-1
                                "
                            >
                                {currency}

                                {
                                    Number(
                                        dashboardData
                                            .totalRevenue || 0
                                    ).toLocaleString()
                                }

                            </h2>

                        </div>

                        <CircleDollarSignIcon
                            className="
                                w-8
                                h-8
                                text-primary
                            "
                        />

                    </div>

                </div>

                {/* =================================================
                    ACTIVE SHOWS
                ================================================= */}

                <div
                    className="
                        bg-primary/10
                        border
                        border-primary/20
                        rounded-lg
                        p-5
                    "
                >

                    <div
                        className="
                            flex
                            items-center
                            justify-between
                        "
                    >

                        <div>

                            <p
                                className="
                                    text-gray-400
                                    text-sm
                                "
                            >
                                Active Shows
                            </p>

                            <h2
                                className="
                                    text-2xl
                                    font-semibold
                                    mt-1
                                "
                            >
                                {
                                    dashboardData
                                        .activeShows
                                        .length
                                }
                            </h2>

                        </div>

                        <PlayCircleIcon
                            className="
                                w-8
                                h-8
                                text-primary
                            "
                        />

                    </div>

                </div>

                {/* =================================================
                    TOTAL USERS
                    FROM User COLLECTION
                    WHERE role = "user"
                ================================================= */}

                <div
                    className="
                        bg-primary/10
                        border
                        border-primary/20
                        rounded-lg
                        p-5
                    "
                >

                    <div
                        className="
                            flex
                            items-center
                            justify-between
                        "
                    >

                        <div>

                            <p
                                className="
                                    text-gray-400
                                    text-sm
                                "
                            >
                                Total Users
                            </p>

                            <h2
                                className="
                                    text-2xl
                                    font-semibold
                                    mt-1
                                "
                            >
                                {
                                    dashboardData.totalUser
                                }
                            </h2>

                        </div>

                        <UsersIcon
                            className="
                                w-8
                                h-8
                                text-primary
                            "
                        />

                    </div>

                </div>

                {/* =================================================
                    TOTAL ADMINS
                    FROM User COLLECTION
                    WHERE role = "admin"
                ================================================= */}

                <div
                    className="
                        bg-primary/10
                        border
                        border-primary/20
                        rounded-lg
                        p-5
                    "
                >

                    <div
                        className="
                            flex
                            items-center
                            justify-between
                        "
                    >

                        <div>

                            <p
                                className="
                                    text-gray-400
                                    text-sm
                                "
                            >
                                Total Admins
                            </p>

                            <h2
                                className="
                                    text-2xl
                                    font-semibold
                                    mt-1
                                "
                            >
                                {
                                    dashboardData.totalAdmin
                                }
                            </h2>

                        </div>

                        <ShieldCheckIcon
                            className="
                                w-8
                                h-8
                                text-primary
                            "
                        />

                    </div>

                </div>

            </div>

            {/* =====================================================
                ACTIVE SHOWS
            ===================================================== */}

            <div>

                <Title
                    text1="Active"
                    text2="Shows"
                />

                <div
                    className="
                        mt-6
                        grid
                        grid-cols-1
                        sm:grid-cols-2
                        lg:grid-cols-4
                        gap-5
                    "
                >

                    {
                        dashboardData
                            .activeShows
                            .map((show) => {

                                const movie =
                                    show.movie;

                                return (

                                    <div
                                        key={show._id}
                                        className="
                                            relative
                                            overflow-hidden
                                            rounded-lg
                                            bg-gray-900
                                            border
                                            border-gray-800
                                        "
                                    >

                                        <img
                                            src={
                                                movie?.poster_path
                                            }
                                            alt={
                                                movie?.title ||
                                                "Movie"
                                            }
                                            className="
                                                w-full
                                                h-64
                                                object-cover
                                            "
                                        />

                                        <div
                                            className="
                                                p-4
                                            "
                                        >

                                            <h3
                                                className="
                                                    font-semibold
                                                    text-lg
                                                    truncate
                                                "
                                            >
                                                {
                                                    movie?.title ||
                                                    "Unknown Movie"
                                                }
                                            </h3>

                                            <div
                                                className="
                                                    flex
                                                    items-center
                                                    justify-between
                                                    mt-2
                                                "
                                            >

                                                <p
                                                    className="
                                                        text-primary
                                                        font-medium
                                                    "
                                                >
                                                    {currency}

                                                    {
                                                        show.showPrice
                                                    }
                                                </p>

                                                <div
                                                    className="
                                                        flex
                                                        items-center
                                                        gap-1
                                                        text-sm
                                                    "
                                                >

                                                    <StarIcon
                                                        className="
                                                            w-4
                                                            h-4
                                                            fill-current
                                                        "
                                                    />

                                                    <span>
                                                        {
                                                            movie?.vote_average
                                                        }
                                                    </span>

                                                </div>

                                            </div>

                                            <p
                                                className="
                                                    text-gray-400
                                                    text-sm
                                                    mt-2
                                                "
                                            >
                                                {
                                                    dateFormat(
                                                        show.showDateTime
                                                    )
                                                }
                                            </p>

                                        </div>

                                    </div>

                                );

                            })
                    }

                </div>

            </div>

        </div>

    );
};

export default Dashboard;