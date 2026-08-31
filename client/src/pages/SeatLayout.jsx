import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  dummyShowsData,
  dummyDateTimeData,
  assets,
} from "../assets/assets";
import { ArrowRightIcon, ClockIcon } from "lucide-react";
import BlurCircle from "../components/BlurCircle";
import { toast } from "react-toastify";

const SeatLayout = () => {
  const groupRows = [
    ["A", "B"],
    ["C", "D"],
    ["E", "F"],
    ["G", "H"],
    ["I", "J"],
  ];

  const { id, date } = useParams();

  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [show, setShow] = useState(null);

  const navigate = useNavigate();

  // ----------------------------------------
  // GET MOVIE DATA
  // ----------------------------------------
  useEffect(() => {
    const movie = dummyShowsData.find(
      (item) => item._id.toString() === id.toString()
    );

    if (movie) {
      setShow({
        movie,
        dateTime: dummyDateTimeData,
      });
    }

    console.log("Movie ID:", id);
    console.log("Date:", date);
    console.log("Date Data:", dummyDateTimeData[date]);
  }, [id, date]);

  // ----------------------------------------
  // SELECT / UNSELECT SEAT
  // ----------------------------------------
  const handleSeatClick = (seatId) => {
    // User must select time first
    if (!selectedTime) {
      return toast("Please select time first");
    }

    // Maximum 5 seats
    if (
      !selectedSeats.includes(seatId) &&
      selectedSeats.length >= 5
    ) {
      return toast("You can only select 5 seats");
    }

    setSelectedSeats((prev) =>
      prev.includes(seatId)
        ? prev.filter((seat) => seat !== seatId)
        : [...prev, seatId]
    );
  };

  // ----------------------------------------
  // RENDER SEATS
  // ----------------------------------------
  const renderSeats = (row, count = 9) => (
    <div key={row} className="flex gap-2 mt-2">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {Array.from({ length: count }, (_, i) => {
          const seatId = `${row}${i + 1}`;

          return (
            <button
              key={seatId}
              onClick={() => handleSeatClick(seatId)}
              className={`h-8 w-8 rounded border border-primary/60 cursor-pointer transition-all ${
                selectedSeats.includes(seatId)
                  ? "bg-primary text-white"
                  : ""
              }`}
            >
              {seatId}
            </button>
          );
        })}
      </div>
    </div>
  );

  // ----------------------------------------
  // PROCEED TO CHECKOUT
  // ----------------------------------------
  const handleCheckout = () => {
    // Check time
    if (!selectedTime) {
      return toast("Please select a show time");
    }

    // Check seats
    if (selectedSeats.length === 0) {
      return toast("Please select at least one seat");
    }

    // Movie data
    const movie = show.movie;

    // Get show price
    const showPrice =
      selectedTime.showPrice ||
      selectedTime.price ||
      movie.showPrice ||
      movie.price ||
      200;

    // Calculate total amount
    const totalAmount =
      showPrice * selectedSeats.length;

    // ----------------------------------------
    // GET OLD BOOKINGS
    // ----------------------------------------
    const existingBookings =
      JSON.parse(localStorage.getItem("bookings")) || [];

    // ----------------------------------------
    // CREATE NEW BOOKING
    // ----------------------------------------
    const newBooking = {
      id: Date.now(),

      movie: movie.title,

      movieId: movie._id,

      poster_path: movie.poster_path,

      date: date,

      time: new Date(selectedTime.time).toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      ),

      showId: selectedTime.showId,

      amount: totalAmount,

      seats: selectedSeats.length,

      bookedSeats: selectedSeats,

      runtime: movie.runtime,

      isPaid: false,
    };

    // ----------------------------------------
    // SAVE BOOKING
    // ----------------------------------------
    const updatedBookings = [
      ...existingBookings,
      newBooking,
    ];

    localStorage.setItem(
      "bookings",
      JSON.stringify(updatedBookings)
    );

    // ----------------------------------------
    // CHECK IN CONSOLE
    // ----------------------------------------
    console.log("New Booking:", newBooking);
    console.log("All Bookings:", updatedBookings);

    // ----------------------------------------
    // SUCCESS MESSAGE
    // ----------------------------------------
    toast.success("Booking created successfully!");

    // ----------------------------------------
    // GO TO MY BOOKINGS
    // ----------------------------------------
    navigate("/my-booking");
  };

  // ----------------------------------------
  // LOADING
  // ----------------------------------------
  if (!show) {
    return (
      <div className="text-center pt-40 text-white">
        Loading...
      </div>
    );
  }

  // ----------------------------------------
  // PAGE
  // ----------------------------------------
  return (
    <div className="flex flex-col md:flex-row px-6 md:px-16 lg:px-40 pt-40">

      {/* ---------------------------------- */}
      {/* TIMING SECTION */}
      {/* ---------------------------------- */}

      <div className="w-60 bg-primary/10 border border-primary/20 rounded-lg py-10">

        <p className="text-lg font-semibold px-6">
          Available Timings
        </p>

        <div className="mt-5 space-y-2">

          {show?.dateTime?.[date]?.map(
            (item, index) => (
              <div
                key={index}
                onClick={() => {
                  setSelectedTime(item);
                  setSelectedSeats([]);
                }}
                className={`flex items-center gap-2 px-6 py-2 cursor-pointer transition-all ${
                  selectedTime?.showId === item.showId
                    ? "bg-primary text-white"
                    : "hover:bg-primary/20"
                }`}
              >

                <ClockIcon className="w-4 h-4" />

                <p className="text-sm">
                  {new Date(
                    item.time
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>

              </div>
            )
          )}

        </div>
      </div>

      {/* ---------------------------------- */}
      {/* SEAT LAYOUT */}
      {/* ---------------------------------- */}

      <div className="relative flex-1 flex flex-col items-center max-md:mt-16">

        <BlurCircle
          top="-100px"
          left="-100px"
        />

        <BlurCircle right="0" />

        <h1 className="text-2xl font-semibold mb-4">
          Select Your Seat
        </h1>

        <img
          src={assets.screenImage}
          alt="screen"
          className="max-w-full"
        />

        <p className="text-gray-400 text-sm mb-6">
          SCREEN SIDE
        </p>

        <div className="flex flex-col items-center mt-10 text-xs text-gray-300">

          {groupRows.map((group, index) => (
            <div
              key={index}
              className="grid grid-cols-2 gap-8 mb-4"
            >
              {group.map((row) =>
                renderSeats(row)
              )}
            </div>
          ))}

        </div>

        {/* ---------------------------------- */}
        {/* SELECTED SEATS */}
        {/* ---------------------------------- */}

        <div className="mt-8 flex flex-col items-center">

          <p className="text-white text-lg mb-2">
            Selected Seats:{" "}
            {selectedSeats.length > 0
              ? selectedSeats.join(", ")
              : "None"}
          </p>

          <p className="text-gray-400 text-sm mb-4">
            Total Seats: {selectedSeats.length}
          </p>

          {/* ---------------------------------- */}
          {/* CHECKOUT BUTTON */}
          {/* ---------------------------------- */}

          <button
            onClick={handleCheckout}
            className="flex items-center justify-center gap-2 px-8 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer active:scale-95"
          >
            Proceed to Checkout

            <ArrowRightIcon
              strokeWidth={3}
              className="w-4 h-4"
            />
          </button>

        </div>
      </div>
    </div>
  );
};

export default SeatLayout;