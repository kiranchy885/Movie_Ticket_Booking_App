
import React, { useEffect, useState } from "react";
import Loading from "../../components/Loading";
import Title from "../../components/admin/Title";
import dateFormat from "../../lib/dateFormat";

const ListShows = () => {
    const currency =
        import.meta.env.VITE_CURRENCY || "Rs.";

    const [shows, setShows] = useState([]);
    const [loading, setLoading] = useState(true);

    // =====================================================
    // GET ALL SHOWS FROM MONGODB
    // =====================================================

    const getAllShows = async () => {
        try {
            setLoading(true);

            const token =
                localStorage.getItem("token");

            if (!token) {
                throw new Error(
                    "You are not logged in. Please login again."
                );
            }

            // =================================================
            // CALL BACKEND
            // =================================================

            const response = await fetch(
                "http://localhost:5000/show/all",
                {
                    method: "GET",

                    headers: {
                        "Content-Type":
                            "application/json",

                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );

            // =================================================
            // READ RESPONSE
            // =================================================

            const data =
                await response.json();

            console.log(
                "All shows from MongoDB:",
                data
            );

            // =================================================
            // HANDLE ERROR
            // =================================================

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                    "Failed to fetch shows"
                );
            }

            // =================================================
            // SET SHOWS
            // =================================================

            setShows(
                Array.isArray(data.shows)
                    ? data.shows
                    : []
            );

        } catch (error) {

            console.error(
                "Error getting shows:",
                error
            );

            setShows([]);

        } finally {

            setLoading(false);

        }
    };

    // =====================================================
    // LOAD SHOWS WHEN PAGE OPENS
    // =====================================================

    useEffect(() => {
        getAllShows();
    }, []);

    // =====================================================
    // LOADING
    // =====================================================

    if (loading) {
        return <Loading />;
    }

    // =====================================================
    // PAGE
    // =====================================================

    return (
        <>
            <Title
                text1="List"
                text2="Shows"
            />

            <div className="max-w-5xl mt-6 overflow-x-auto">

                <table className="w-full border-collapse rounded-md overflow-hidden text-nowrap">

                    {/* ================================================= */}
                    {/* TABLE HEADER */}
                    {/* ================================================= */}

                    <thead>
                        <tr className="bg-primary/20 text-left text-white">

                            <th className="p-3 font-medium pl-5">
                                Movie Name
                            </th>

                            <th className="p-3 font-medium">
                                Show Time
                            </th>

                            <th className="p-3 font-medium">
                                Show Price
                            </th>

                            <th className="p-3 font-medium">
                                Total Bookings
                            </th>

                            <th className="p-3 font-medium">
                                Earnings
                            </th>

                        </tr>
                    </thead>

                    {/* ================================================= */}
                    {/* TABLE BODY */}
                    {/* ================================================= */}

                    <tbody className="text-sm font-light">

                        {shows.length > 0 ? (

                            shows.map((show) => {

                                // =================================================
                                // COUNT BOOKED SEATS
                                // =================================================

                                const totalBookings =
                                    Object.keys(
                                        show.occupiedSeats || {}
                                    ).length;

                                // =================================================
                                // CALCULATE EARNINGS
                                // =================================================

                                const earnings =
                                    totalBookings *
                                    Number(
                                        show.showPrice || 0
                                    );

                                return (

                                    <tr
                                        key={show._id}
                                        className="border-b border-primary/10 bg-primary/5 even:bg-primary/10 hover:bg-primary/20 transition"
                                    >

                                        {/* ================================================= */}
                                        {/* MOVIE NAME */}
                                        {/* ================================================= */}

                                        <td className="p-3 min-w-45 pl-5">

                                            {show.movie?.title ||
                                                "Unknown Movie"}

                                        </td>

                                        {/* ================================================= */}
                                        {/* SHOW DATE & TIME */}
                                        {/* ================================================= */}

                                        <td className="p-3">

                                            {show.showDateTime
                                                ? dateFormat(
                                                    show.showDateTime
                                                )
                                                : "N/A"}

                                        </td>

                                        {/* ================================================= */}
                                        {/* SHOW PRICE */}
                                        {/* ================================================= */}

                                        <td className="p-3">

                                            {currency}
                                            {show.showPrice}

                                        </td>

                                        {/* ================================================= */}
                                        {/* TOTAL BOOKINGS */}
                                        {/* ================================================= */}

                                        <td className="p-3">

                                            {totalBookings}

                                        </td>

                                        {/* ================================================= */}
                                        {/* EARNINGS */}
                                        {/* ================================================= */}

                                        <td className="p-3">

                                            {currency}
                                            {earnings}

                                        </td>

                                    </tr>

                                );

                            })

                        ) : (

                            <tr>

                                <td
                                    colSpan="5"
                                    className="text-center py-8 text-gray-400"
                                >
                                    No shows found. Add a show from Add Shows.
                                </td>

                            </tr>

                        )}

                    </tbody>

                </table>

            </div>
        </>
    );
};

export default ListShows;