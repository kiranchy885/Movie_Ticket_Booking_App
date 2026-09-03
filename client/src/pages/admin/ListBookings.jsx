
import React, { useEffect, useState } from "react";
import Title from "../../components/admin/Title";
import Loading from "../../components/Loading";

const ListBookings = () => {
    const currency =
        import.meta.env.VITE_CURRENCY || "Rs.";

    const [bookings, setBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    // =====================================================
    // DATE FORMAT
    // =====================================================

    const dateFormat = (date) => {
        if (!date) {
            return "N/A";
        }

        try {
            const formattedDate =
                new Date(date).toLocaleString(
                    "en-US",
                    {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    }
                );

            return formattedDate;

        } catch (error) {
            return "Invalid Date";
        }
    };

    // =====================================================
    // GET ALL BOOKINGS FROM MONGODB
    // =====================================================

    const getAllBookings = async () => {
        try {
            setIsLoading(true);
            setError("");

            // =================================================
            // GET LOGIN TOKEN
            // =================================================

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
                "http://localhost:5000/booking/all",
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
                "Bookings received from MongoDB:",
                data
            );

            // =================================================
            // HANDLE ERROR
            // =================================================

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                    "Failed to fetch bookings"
                );
            }

            // =================================================
            // SAVE BOOKINGS
            // =================================================

            setBookings(
                Array.isArray(data.bookings)
                    ? data.bookings
                    : []
            );

        } catch (error) {

            console.error(
                "Error loading bookings:",
                error
            );

            setError(
                error.message ||
                "Failed to load bookings"
            );

            setBookings([]);

        } finally {

            setIsLoading(false);

        }
    };

    // =====================================================
    // LOAD BOOKINGS WHEN PAGE OPENS
    // =====================================================

    useEffect(() => {
        getAllBookings();
    }, []);

    // =====================================================
    // LOADING
    // =====================================================

    if (isLoading) {
        return <Loading />;
    }

    // =====================================================
    // PAGE
    // =====================================================

    return (
        <>
            <Title
                text1="List"
                text2="Bookings"
            />

            {/* ================================================= */}
            {/* ERROR */}
            {/* ================================================= */}

            {error && (
                <div className="mt-6 max-w-6xl px-4 py-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400">
                    {error}
                </div>
            )}

            {/* ================================================= */}
            {/* BOOKINGS TABLE */}
            {/* ================================================= */}

            <div className="max-w-6xl mt-6 overflow-x-auto">

                <table className="w-full border-collapse rounded-md overflow-hidden text-nowrap">

                    {/* ================================================= */}
                    {/* HEADER */}
                    {/* ================================================= */}

                    <thead>

                        <tr className="bg-primary/20 text-left text-white">

                            <th className="p-3 font-medium pl-5">
                                User Name
                            </th>

                            <th className="p-3 font-medium">
                                Movie Name
                            </th>

                            <th className="p-3 font-medium">
                                Show Time
                            </th>

                            <th className="p-3 font-medium">
                                Seats
                            </th>

                            <th className="p-3 font-medium">
                                Amount
                            </th>

                        </tr>

                    </thead>

                    {/* ================================================= */}
                    {/* BODY */}
                    {/* ================================================= */}

                    <tbody className="text-sm">

                        {bookings.length > 0 ? (

                            bookings.map(
                                (item, index) => {

                                    // =============================================
                                    // USER NAME
                                    // =============================================

                                    const userName =
                                        item.user?.name ||
                                        item.userName ||
                                        item.name ||
                                        "Unknown User";

                                    // =============================================
                                    // MOVIE NAME
                                    // =============================================

                                    const movieName =
                                        item.show?.movie?.title ||
                                        item.movie?.title ||
                                        item.movieName ||
                                        "Unknown Movie";

                                    // =============================================
                                    // SHOW TIME
                                    // =============================================

                                    const showTime =
                                        item.show?.showDateTime ||
                                        item.showDateTime ||
                                        item.dateTime;

                                    // =============================================
                                    // SEATS
                                    // =============================================

                                    let seats = [];

                                    if (
                                        Array.isArray(
                                            item.bookedSeats
                                        )
                                    ) {

                                        seats =
                                            item.bookedSeats;

                                    } else if (
                                        item.bookedSeats &&
                                        typeof item.bookedSeats ===
                                            "object"
                                    ) {

                                        seats =
                                            Object.keys(
                                                item.bookedSeats
                                            );

                                    } else if (
                                        Array.isArray(
                                            item.seats
                                        )
                                    ) {

                                        seats =
                                            item.seats;

                                    } else if (
                                        item.seats &&
                                        typeof item.seats ===
                                            "object"
                                    ) {

                                        seats =
                                            Object.keys(
                                                item.seats
                                            );
                                    }

                                    // =============================================
                                    // AMOUNT
                                    // =============================================

                                    const amount =
                                        Number(
                                            item.amount
                                        ) ||
                                        Number(
                                            item.totalAmount
                                        ) ||
                                        Number(
                                            item.total
                                        ) ||
                                        0;

                                    return (

                                        <tr
                                            key={
                                                item._id ||
                                                item.id ||
                                                index
                                            }
                                            className="border-b border-primary/20 bg-primary/5 even:bg-primary/10 hover:bg-primary/20 transition"
                                        >

                                            {/* ================================= */}
                                            {/* USER */}
                                            {/* ================================= */}

                                            <td className="p-4 pl-5">

                                                {userName}

                                            </td>

                                            {/* ================================= */}
                                            {/* MOVIE */}
                                            {/* ================================= */}

                                            <td className="p-4">

                                                {movieName}

                                            </td>

                                            {/* ================================= */}
                                            {/* SHOW TIME */}
                                            {/* ================================= */}

                                            <td className="p-4">

                                                {dateFormat(
                                                    showTime
                                                )}

                                            </td>

                                            {/* ================================= */}
                                            {/* SEATS */}
                                            {/* ================================= */}

                                            <td className="p-4">

                                                {seats.length > 0
                                                    ? seats.join(", ")
                                                    : "-"}

                                            </td>

                                            {/* ================================= */}
                                            {/* AMOUNT */}
                                            {/* ================================= */}

                                            <td className="p-4">

                                                {currency}
                                                {amount}

                                            </td>

                                        </tr>

                                    );
                                }
                            )

                        ) : (

                            <tr>

                                <td
                                    colSpan="5"
                                    className="text-center py-8 text-gray-400"
                                >
                                    No bookings found.
                                </td>

                            </tr>

                        )}

                    </tbody>

                </table>

            </div>
        </>
    );
};

export default ListBookings;