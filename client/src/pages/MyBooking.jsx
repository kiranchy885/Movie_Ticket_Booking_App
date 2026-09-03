
import React, { useEffect, useState } from "react";
import BlurCircle from "../components/BlurCircle";

const MyBooking = () => {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // =========================================
  // FETCH USER BOOKINGS FROM MONGODB
  // =========================================

  const getMyBookings = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:3000/booking/my",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",

            ...(token && {
              Authorization: `Bearer ${token}`,
            }),
          },
        }
      );

      const data = await response.json();

      console.log("Bookings from MongoDB:", data);

      if (data.success) {
        setBookings(data.bookings || []);
      } else {
        setBookings([]);
        console.error(data.message);
      }
    } catch (error) {
      console.error(
        "Error fetching bookings:",
        error
      );

      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getMyBookings();
  }, []);

  // =========================================
  // PAY FOR BOOKING
  // =========================================

  const handlePay = async (id) => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:3000/booking/pay/${id}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",

            ...(token && {
              Authorization: `Bearer ${token}`,
            }),
          },
        }
      );

      const data = await response.json();

      if (!data.success) {
        alert(
          data.message ||
            "Payment failed"
        );

        return;
      }

      // Update payment status in UI
      setBookings((prev) =>
        prev.map((booking) =>
          booking._id === id
            ? {
                ...booking,
                isPaid: true,
              }
            : booking
        )
      );
    } catch (error) {
      console.error(
        "Payment error:",
        error
      );

      alert(
        "Unable to process payment."
      );
    }
  };

  // =========================================
  // LOADING
  // =========================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <p className="text-gray-400">
          Loading bookings...
        </p>
      </div>
    );
  }

  // =========================================
  // PAGE
  // =========================================

  return (
    <div className="relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40 min-h-[80vh]">

      <BlurCircle
        top="100px"
        left="100px"
      />

      <BlurCircle
        bottom="0px"
        left="600px"
      />

      {/* HEADER */}

      <h1 className="text-2xl font-semibold mb-6">
        My Bookings
      </h1>


      {/* NO BOOKINGS */}

      {bookings.length === 0 ? (

        <p className="text-gray-400">
          No bookings found.
        </p>

      ) : (

        <div className="space-y-4 max-w-5xl">

          {bookings.map((item) => {

            // =================================
            // POPULATED SHOW
            // =================================

            const show = item.show;

            // =================================
            // POPULATED MOVIE
            // =================================

            const movie = show?.movie;


            // =================================
            // DATE & TIME FROM DATABASE
            // =================================

            const showDateTime =
              show?.showDateTime
                ? new Date(
                    show.showDateTime
                  )
                : null;


            const date =
              showDateTime
                ? showDateTime.toLocaleDateString(
                    "en-CA"
                  )
                : "N/A";


            const time =
              showDateTime
                ? showDateTime.toLocaleTimeString(
                    "en-US",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )
                : "N/A";


            // =================================
            // MOVIE INFORMATION
            // =================================

            const movieTitle =
              movie?.title ||
              "Unknown Movie";


            const poster =
              movie?.poster_path;


            const runtime =
              movie?.runtime;


            // =================================
            // TICKET COUNT
            // =================================

            const bookedSeats =
              item.bookedSeats || [];


            const ticketCount =
              bookedSeats.length;


            return (

              <div
                key={item._id}
                className="
                  flex
                  flex-col
                  md:flex-row
                  justify-between
                  gap-6
                  p-4
                  rounded-lg
                  border
                  border-primary/20
                  bg-primary/10
                "
              >

                {/* ================================= */}
                {/* LEFT SIDE */}
                {/* ================================= */}

                <div className="flex gap-4">

                  {/* MOVIE POSTER */}

                  {poster ? (

                    <img
                      src={poster}
                      alt={movieTitle}
                      className="
                        w-28
                        h-40
                        object-cover
                        rounded-md
                      "
                    />

                  ) : (

                    <div
                      className="
                        w-28
                        h-40
                        bg-gray-800
                        rounded-md
                        flex
                        items-center
                        justify-center
                        text-xs
                        text-gray-500
                      "
                    >
                      No Image
                    </div>

                  )}


                  {/* MOVIE DETAILS */}

                  <div className="flex flex-col justify-between">

                    <div>

                      <h2 className="text-lg font-semibold">
                        {movieTitle}
                      </h2>


                      {/* DATABASE DATE */}

                      <p className="text-sm text-gray-400 mt-1">
                        📅 {date}
                      </p>


                      {/* DATABASE TIME */}

                      <p className="text-sm text-gray-400">
                        ⏰ {time}
                      </p>


                      {/* DATABASE RUNTIME */}

                      <p className="text-sm text-gray-400 mt-1">
                        ⏱ Duration:{" "}
                        {runtime
                          ? `${runtime} minutes`
                          : "N/A"}
                      </p>

                    </div>

                  </div>

                </div>


                {/* ================================= */}
                {/* RIGHT SIDE */}
                {/* ================================= */}

                <div className="flex flex-col items-end justify-between">

                  <div className="text-right">

                    {/* AMOUNT */}

                    <p className="text-xl font-semibold">
                      Rs.{" "}
                      {item.amount ||
                        show?.showPrice ||
                        0}
                    </p>


                    {/* TOTAL TICKETS */}

                    <p className="text-sm text-gray-400">
                      Total Tickets:{" "}
                      {ticketCount}
                    </p>


                    {/* SEATS */}

                    <p className="text-sm text-gray-400">
                      Seats:{" "}
                      {bookedSeats.length > 0
                        ? bookedSeats.join(", ")
                        : "N/A"}
                    </p>

                  </div>


                  {/* PAYMENT STATUS */}

                  {!item.isPaid ? (

                    <button
                      onClick={() =>
                        handlePay(
                          item._id
                        )
                      }
                      className="
                        mt-3
                        bg-primary
                        px-4
                        py-1.5
                        text-sm
                        rounded-full
                        font-medium
                        hover:bg-primary-dull
                        transition
                      "
                    >
                      Pay Now
                    </button>

                  ) : (

                    <span className="text-green-400 font-medium mt-3">
                      Paid ✔
                    </span>

                  )}

                </div>

              </div>

            );
          })}

        </div>

      )}

    </div>
  );
};

export default MyBooking;