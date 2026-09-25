import React, { useEffect, useState } from "react";
import Title from "../../components/admin/Title";
import Loading from "../../components/Loading";
import { MapPin, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const ListBookings = () => {
    const currency = import.meta.env.VITE_CURRENCY || "Rs.";
    const { adminToken } = useAuth();

    const [bookings, setBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [deletingId, setDeletingId] = useState(null);

    // =====================================================
    // DATE FORMAT
    // =====================================================
    const dateFormat = (date) => {
        if (!date) return "N/A";
        try {
            return new Date(date).toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return "Invalid Date";
        }
    };

    // =====================================================
    // RESOLVE THEATER INFO FROM A BOOKING
    // =====================================================
    const resolveTheater = (booking) => {
        if (!booking) return null;

        if (booking.theaterId && typeof booking.theaterId === "object") {
            return {
                name: booking.theaterId.name || "",
                city: booking.theaterId.city || "",
                address: booking.theaterId.address || "",
            };
        }

        const show = booking.show;
        if (
            show &&
            typeof show === "object" &&
            show.theaterId &&
            typeof show.theaterId === "object"
        ) {
            return {
                name: show.theaterId.name || "",
                city: show.theaterId.city || "",
                address: show.theaterId.address || "",
            };
        }

        if (show && typeof show === "object" && show.theaterName) {
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

        return null;
    };

    // =====================================================
    // GET ALL BOOKINGS
    // =====================================================
    const getAllBookings = async () => {
        try {
            setIsLoading(true);
            setError("");

            if (!adminToken) {
                throw new Error("You are not logged in. Please login again.");
            }

            const response = await fetch("http://localhost:5000/booking/all", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${adminToken}`,
                },
            });

            const data = await response.json();
            console.log("Bookings received from MongoDB:", data);

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to fetch bookings");
            }

            const rawBookings = Array.isArray(data.bookings) ? data.bookings : [];

            if (rawBookings.length > 0) {
                console.log("Sample booking structure:", rawBookings[0]);
            }

            setBookings(rawBookings);
            setError(rawBookings.length === 0 ? "No bookings found." : "");
        } catch (error) {
            console.error("Error loading bookings:", error);
            setError(error.message || "Failed to load bookings");
            setBookings([]);
        } finally {
            setIsLoading(false);
        }
    };

    // =====================================================
    // DELETE A BOOKING
    // -----------------------------------------------------
    // Calls DELETE /booking/:bookingId on the backend,
    // which cascades to:
    //   • bookings collection (removes the doc)
    //   • users.bookings array (removes the ref)
    //   • show.occupiedSeats (frees the seats)
    // =====================================================
    const handleDelete = async (bookingId, label) => {
        const confirmed = window.confirm(
            `Delete booking "${label}"?\n\nThis will remove it permanently from the database and free up the seats.`
        );
        if (!confirmed) return;

        try {
            setDeletingId(bookingId);
            setError("");

            if (!adminToken) {
                throw new Error("You are not logged in. Please login again.");
            }

            const response = await fetch(
                `http://localhost:5000/booking/${bookingId}`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${adminToken}`,
                    },
                }
            );

            const data = await response.json();
            console.log("Delete response:", data);

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to delete booking");
            }

            // Remove from local state instantly (no full refetch needed)
            setBookings((prev) =>
                prev.filter((b) => String(b._id) !== String(bookingId))
            );

            // Refetch to stay perfectly in sync with the DB
            await getAllBookings();
        } catch (err) {
            console.error("Delete error:", err);
            setError(err.message || "Failed to delete booking");
        } finally {
            setDeletingId(null);
        }
    };

    // =====================================================
    // LOAD BOOKINGS WHEN PAGE OPENS
    // =====================================================
    useEffect(() => {
        getAllBookings();
        // eslint-disable-next-line
    }, [adminToken]);

    if (isLoading) {
        return <Loading />;
    }

    return (
        <>
            <Title text1="List" text2="Bookings (All)" />

            {error && (
                <div className="mt-6 max-w-6xl px-4 py-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400">
                    {error}
                </div>
            )}

            <div className="max-w-6xl mt-6 overflow-x-auto">
                <table className="w-full border-collapse rounded-md overflow-hidden text-nowrap">
                    <thead>
                        <tr className="bg-primary/20 text-left text-white">
                            <th className="p-3 font-medium pl-5">User Name</th>
                            <th className="p-3 font-medium">Movie Name</th>
                            <th className="p-3 font-medium">Theater</th>
                            <th className="p-3 font-medium">Show Time</th>
                            <th className="p-3 font-medium">Seats</th>
                            <th className="p-3 font-medium">Amount</th>
                            <th className="p-3 font-medium">Status</th>
                            <th className="p-3 font-medium text-center">Action</th>
                        </tr>
                    </thead>

                    <tbody className="text-sm">
                        {bookings.length > 0 ? (
                            bookings.map((item, index) => {
                                const userName =
                                    item.user?.name ||
                                    item.userName ||
                                    item.user_name ||
                                    item.name ||
                                    item.userId?.name ||
                                    item.customerName ||
                                    "Unknown User";

                                const movieName =
                                    item.show?.movie?.title ||
                                    item.movie?.title ||
                                    item.movieName ||
                                    "Unknown Movie";

                                const showTime =
                                    item.show?.showDateTime ||
                                    item.showDateTime ||
                                    item.dateTime;

                                const theater = resolveTheater(item);

                                let seats = [];
                                if (Array.isArray(item.bookedSeats)) {
                                    seats = item.bookedSeats;
                                } else if (
                                    item.bookedSeats &&
                                    typeof item.bookedSeats === "object"
                                ) {
                                    seats = Object.keys(item.bookedSeats);
                                } else if (Array.isArray(item.seats)) {
                                    seats = item.seats;
                                } else if (
                                    item.seats &&
                                    typeof item.seats === "object"
                                ) {
                                    seats = Object.keys(item.seats);
                                }

                                const amount =
                                    Number(item.amount) ||
                                    Number(item.totalAmount) ||
                                    Number(item.total) ||
                                    0;

                                const isPaid = item.isPaid === true;

                                const bookingId =
                                    item._id || item.id || index;

                                const isDeleting =
                                    deletingId === bookingId;

                                return (
                                    <tr
                                        key={bookingId}
                                        className="border-b border-primary/20 bg-primary/5 even:bg-primary/10 hover:bg-primary/20 transition"
                                    >
                                        <td className="p-4 pl-5">{userName}</td>
                                        <td className="p-4">{movieName}</td>

                                        <td className="p-4">
                                            {theater?.name ? (
                                                <div>
                                                    <p className="text-white text-sm font-medium">
                                                        {theater.name}
                                                    </p>
                                                    {(theater.city ||
                                                        theater.address) && (
                                                        <p className="text-[11px] text-gray-400 flex items-center gap-1">
                                                            <MapPin size={10} />
                                                            {theater.city &&
                                                                `${theater.city}, `}
                                                            {theater.address}
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-gray-500 text-xs">
                                                    N/A
                                                </span>
                                            )}
                                        </td>

                                        <td className="p-4">{dateFormat(showTime)}</td>

                                        <td className="p-4">
                                            {seats.length > 0 ? seats.join(", ") : "-"}
                                        </td>

                                        <td className="p-4">
                                            {currency}
                                            {amount}
                                        </td>

                                        <td className="p-4">
                                            {isPaid ? (
                                                <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">
                                                    Paid
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400">
                                                    Unpaid
                                                </span>
                                            )}
                                        </td>

                                        {/* ===== DELETE ACTION ===== */}
                                        <td className="p-4 text-center">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleDelete(
                                                        bookingId,
                                                        `${movieName} — ${userName}`
                                                    )
                                                }
                                                disabled={isDeleting}
                                                title="Delete booking"
                                                className={`inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs rounded-md border transition
                                                    ${
                                                        isDeleting
                                                            ? "bg-red-500/10 border-red-500/20 text-red-300 cursor-not-allowed opacity-60"
                                                            : "bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30 hover:text-red-200"
                                                    }`}
                                            >
                                                <Trash2 size={14} />
                                                {isDeleting ? "Deleting..." : "Delete"}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="8" className="text-center py-8 text-gray-400">
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