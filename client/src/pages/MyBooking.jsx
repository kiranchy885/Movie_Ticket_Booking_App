import React, { useState, useEffect } from "react";
import BlurCircle from "../components/BlurCircle";
import { dummyShowsData } from "../assets/assets";

const MyBooking = () => {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const getMyBookings = () => {
    const stored =
      JSON.parse(localStorage.getItem("bookings")) || [];

    setBookings(stored);
    setIsLoading(false);
  };

  useEffect(() => {
    getMyBookings();
  }, []);

  const handlePay = (id) => {
    const updated = bookings.map((b) =>
      b.id === id ? { ...b, isPaid: true } : b
    );

    setBookings(updated);
    localStorage.setItem("bookings", JSON.stringify(updated));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <p className="text-gray-400">Loading bookings...</p>
      </div>
    );
  }

  return (
    <div className="relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40 min-h-[80vh]">

      <BlurCircle top="100px" left="100px" />
      <BlurCircle bottom="0px" left="600px" />

      {/* HEADER */}
      <h1 className="text-2xl font-semibold mb-6">My Bookings</h1>

      {bookings.length === 0 ? (
        <p className="text-gray-400">No bookings found.</p>
      ) : (
        <div className="space-y-4 max-w-5xl">

          {bookings.map((item) => {

            // 🔥 FIND REAL MOVIE FROM ASSETS
            const movieData = dummyShowsData.find(
              (m) => m.title === item.movie
            );

            return (
              <div
                key={item.id}
                className="flex flex-col md:flex-row justify-between gap-6 p-4 rounded-lg border border-primary/20 bg-primary/10"
              >

                {/* LEFT SIDE */}
                <div className="flex gap-4">

                  <img
                    src={movieData?.poster_path}
                    alt={item.movie}
                    className="w-28 h-40 object-cover rounded-md"
                  />

                  <div className="flex flex-col justify-between">

                    <div>
                      <h2 className="text-lg font-semibold">
                        {item.movie}
                      </h2>

                      <p className="text-sm text-gray-400">
                        📅 {item.date} | ⏰ {item.time}
                      </p>

                      <p className="text-sm text-gray-400">
                        ⏱ Duration: {movieData?.runtime}minutes
                      </p>
                    </div>

                   

                  </div>

                </div>

                {/* RIGHT SIDE */}
                <div className="flex flex-col items-end justify-between">

                  <div className="text-right">
                    <p className="text-xl font-semibold">
                      Rs. {item.amount}
                    </p>

                    <p className="text-sm text-gray-400">
                      Total Tickets: {item.seats}
                    </p>

                    <p className="text-sm text-gray-400">
                      Seats: {item.bookedSeats?.join(", ")}
                    </p>
                  </div>

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