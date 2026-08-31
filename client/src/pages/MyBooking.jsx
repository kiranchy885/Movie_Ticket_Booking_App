import React, { useState, useEffect } from "react";
import BlurCircle from "../components/BlurCircle";
import { dummyShowsData } from "../assets/assets";

const MyBooking = () => {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // GET BOOKINGS FROM LOCAL STORAGE
  const getMyBookings = () => {
    try {
      const storedBookings = localStorage.getItem("bookings");

      if (storedBookings) {
        const parsedBookings = JSON.parse(storedBookings);

        if (Array.isArray(parsedBookings)) {
          setBookings(parsedBookings);
        } else {
          setBookings([]);
        }
      } else {
        setBookings([]);
      }
    } catch (error) {
      console.error("Error loading bookings:", error);
      setBookings([]);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    getMyBookings();
  }, []);

  // PAY BOOKING
  const handlePay = (id) => {
    const updatedBookings = bookings.map((booking) =>
      booking.id === id
        ? { ...booking, isPaid: true }
        : booking
    );

    setBookings(updatedBookings);

    localStorage.setItem(
      "bookings",
      JSON.stringify(updatedBookings)
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <p className="text-gray-400">
          Loading bookings...
        </p>
      </div>
    );
  }

  return (
    <div className="relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40 min-h-[80vh]">

      <BlurCircle top="100px" left="100px" />
      <BlurCircle bottom="0px" left="600px" />

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

        /* BOOKINGS LIST */
        <div className="space-y-4 max-w-5xl">

          {bookings.map((item, index) => {

            // FIND MOVIE FROM DUMMY DATA
            const movieData = dummyShowsData.find(
              (movie) =>
                movie.title === item.movie ||
                movie._id === item.movieId ||
                movie.id === item.movieId
            );

            return (
              <div
                key={item.id || index}
                className="flex flex-col md:flex-row justify-between gap-6 p-4 rounded-lg border border-primary/20 bg-primary/10"
              >

                {/* LEFT SIDE */}
                <div className="flex gap-4">

                  {/* MOVIE POSTER */}
                  <img
                    src={movieData?.poster_path}
                    alt={item.movie || "Movie"}
                    className="w-28 h-40 object-cover rounded-md"
                  />

                  {/* MOVIE INFORMATION */}
                  <div className="flex flex-col justify-between">

                    <div>

                      <h2 className="text-lg font-semibold">
                        {item.movie}
                      </h2>

                      <p className="text-sm text-gray-400 mt-2">
                        📅 {item.date}
                      </p>

                      <p className="text-sm text-gray-400">
                        ⏰ {item.time}
                      </p>

                      <p className="text-sm text-gray-400 mt-2">
                        ⏱ Duration:{" "}
                        {movieData?.runtime || item.runtime || "N/A"} minutes
                      </p>

                    </div>

                  </div>
                </div>

                {/* RIGHT SIDE */}
                <div className="flex flex-col items-end justify-between">

                  <div className="text-right">

                    {/* AMOUNT */}
                    <p className="text-xl font-semibold">
                      Rs. {item.amount}
                    </p>

                    {/* NUMBER OF TICKETS */}
                    <p className="text-sm text-gray-400">
                      Total Tickets:{" "}
                      {item.seats ||
                        item.bookedSeats?.length ||
                        0}
                    </p>

                    {/* BOOKED SEATS */}
                    <p className="text-sm text-gray-400">
                      Seats:{" "}
                      {item.bookedSeats?.length > 0
                        ? item.bookedSeats.join(", ")
                        : "No seats"}
                    </p>

                  </div>

                  {/* PAYMENT */}
                  {!item.isPaid ? (
                    <button
                      onClick={() => handlePay(item.id)}
                      className="mt-3 bg-primary px-4 py-1.5 text-sm rounded-full font-medium"
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