
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { assets } from "../assets/assets";
import { ArrowRightIcon, ClockIcon } from "lucide-react";
import BlurCircle from "../components/BlurCircle";
import { toast } from "react-toastify";
import { useAppContext } from "../context/AppContext";

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

  // Seats already booked in MongoDB
  const [occupiedSeats, setOccupiedSeats] = useState([]);

  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const { axios, getToken, user } = useAppContext();

  // ============================================================
  // GET SHOW DATA
  // ============================================================

  const getShow = async () => {
    try {
      setLoading(true);

      const { data } = await axios.get(`/api/show/${id}`);

      console.log("Show data:", data);

      if (data.success) {
        setShow(data);
      }
    } catch (error) {
      console.log("Error getting show:", error);
      toast.error("Unable to load show");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // GET OCCUPIED SEATS FROM DATABASE
  // ============================================================

  const getOccupiedSeats = async (showId) => {
    try {
      if (!showId) return;

      console.log("Getting occupied seats for:", showId);

      const { data } = await axios.get(
        `/api/booking/occupied-seats/${showId}`
      );

      console.log("Occupied seats response:", data);

      if (data.success) {
        setOccupiedSeats(data.occupiedSeats || []);
      } else {
        setOccupiedSeats([]);
      }
    } catch (error) {
      console.log("Error getting occupied seats:", error);

      setOccupiedSeats([]);
    }
  };

  // ============================================================
  // LOAD SHOW
  // ============================================================

  useEffect(() => {
    getShow();
  }, [id]);

  // ============================================================
  // WHEN USER SELECTS SHOW TIME
  // GET OCCUPIED SEATS FOR THAT SHOW
  // ============================================================

  useEffect(() => {
    if (selectedTime?.showId) {
      getOccupiedSeats(selectedTime.showId);

      // Clear previously selected seats
      setSelectedSeats([]);
    }
  }, [selectedTime]);

  // ============================================================
  // SELECT / UNSELECT SEAT
  // ============================================================

  const handleSeatClick = (seatId) => {
    // User must select show time first
    if (!selectedTime) {
      return toast.warning("Please select time first");
    }

    // ----------------------------------------
    // PREVENT OCCUPIED SEAT
    // ----------------------------------------

    if (occupiedSeats.includes(seatId)) {
      return toast.error(`${seatId} is already occupied`);
    }

    // ----------------------------------------
    // MAXIMUM 5 SEATS
    // ----------------------------------------

    if (
      !selectedSeats.includes(seatId) &&
      selectedSeats.length >= 5
    ) {
      return toast.warning("You can only select 5 seats");
    }

    // ----------------------------------------
    // SELECT / UNSELECT
    // ----------------------------------------

    setSelectedSeats((prev) => {
      if (prev.includes(seatId)) {
        // Remove seat
        return prev.filter((seat) => seat !== seatId);
      } else {
        // Add seat
        return [...prev, seatId];
      }
    });
  };

  // ============================================================
  // RENDER SEATS
  // ============================================================

  const renderSeats = (row, count = 9) => (
    <div key={row} className="flex gap-2 mt-2">
      <div className="flex flex-wrap items-center justify-center gap-2">

        {Array.from({ length: count }, (_, i) => {
          const seatId = `${row}${i + 1}`;

          const isOccupied = occupiedSeats.includes(seatId);

          const isSelected = selectedSeats.includes(seatId);

          return (
            <button
              key={seatId}
              type="button"
              disabled={isOccupied}
              onClick={() => handleSeatClick(seatId)}
              className={`
                h-8
                w-8
                rounded
                border
                text-xs
                transition-all

                ${
                  isOccupied
                    ? "bg-gray-700 text-gray-500 border-gray-600 cursor-not-allowed opacity-50"
                    : isSelected
                    ? "bg-primary text-white border-primary cursor-pointer scale-105"
                    : "border-primary/60 text-white cursor-pointer hover:bg-primary/20"
                }
              `}
            >
              {seatId}
            </button>
          );
        })}

      </div>
    </div>
  );

  // ============================================================
  // PROCEED TO CHECKOUT
  // ============================================================

  const handleCheckout = async () => {
    // ----------------------------------------
    // CHECK LOGIN
    // ----------------------------------------

    if (!user) {
      return toast.warning("Please login before booking");
    }

    // ----------------------------------------
    // CHECK TIME
    // ----------------------------------------

    if (!selectedTime) {
      return toast.warning("Please select a show time");
    }

    // ----------------------------------------
    // CHECK SEATS
    // ----------------------------------------

    if (selectedSeats.length === 0) {
      return toast.warning("Please select at least one seat");
    }

    // ----------------------------------------
    // DOUBLE CHECK OCCUPIED SEATS
    // ----------------------------------------

    const alreadyOccupied = selectedSeats.filter((seat) =>
      occupiedSeats.includes(seat)
    );

    if (alreadyOccupied.length > 0) {
      return toast.error(
        `These seats are already occupied: ${alreadyOccupied.join(", ")}`
      );
    }

    try {
      // ----------------------------------------
      // GET TOKEN
      // ----------------------------------------

      const token = await getToken();

      // ----------------------------------------
      // MOVIE DATA
      // ----------------------------------------

      const movie = show.movie;

      // ----------------------------------------
      // SHOW PRICE
      // ----------------------------------------

      const showPrice =
        selectedTime.showPrice ||
        selectedTime.price ||
        movie.showPrice ||
        movie.price ||
        200;

      // ----------------------------------------
      // TOTAL AMOUNT
      // ----------------------------------------

      const totalAmount =
        showPrice * selectedSeats.length;

      // ----------------------------------------
      // BOOKING DATA
      // ----------------------------------------

      const bookingData = {
        showId: selectedTime.showId,

        movieId: movie._id,

        movie: movie.title,

        poster_path: movie.poster_path,

        date: date,

        time: selectedTime.time,

        seats: selectedSeats,

        amount: totalAmount,

        runtime: movie.runtime,
      };

      console.log("Sending booking:", bookingData);

      // ----------------------------------------
      // SAVE BOOKING TO MONGODB
      // ----------------------------------------

      const { data } = await axios.post(
        "/api/booking/create",
        bookingData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Booking response:", data);

      // ----------------------------------------
      // BOOKING SUCCESS
      // ----------------------------------------

      if (data.success) {
        toast.success("Booking created successfully!");

        // Update occupied seats immediately
        setOccupiedSeats((prev) => [
          ...prev,
          ...selectedSeats,
        ]);

        // Clear selected seats
        setSelectedSeats([]);

        // Navigate to My Booking
        navigate("/my-booking");
      } else {
        toast.error(
          data.message || "Booking failed"
        );
      }

    } catch (error) {
      console.log(
        "Booking error:",
        error.response?.data || error
      );

      toast.error(
        error.response?.data?.message ||
          "Unable to create booking"
      );
    }
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading || !show) {
    return (
      <div className="text-center pt-40 text-white">
        Loading...
      </div>
    );
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="flex flex-col md:flex-row px-6 md:px-16 lg:px-40 pt-40">

      {/* ====================================================== */}
      {/* TIMING SECTION */}
      {/* ====================================================== */}

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
                className={`
                  flex
                  items-center
                  gap-2
                  px-6
                  py-2
                  cursor-pointer
                  transition-all

                  ${
                    selectedTime?.showId === item.showId
                      ? "bg-primary text-white"
                      : "hover:bg-primary/20"
                  }
                `}
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

      {/* ====================================================== */}
      {/* SEAT LAYOUT */}
      {/* ====================================================== */}

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

        {/* ==================================================== */}
        {/* SEAT LEGEND */}
        {/* ==================================================== */}

        <div className="flex gap-6 mb-6 text-sm">

          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border border-primary/60 rounded" />
            <span>Available</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-primary rounded" />
            <span>Selected</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gray-700 opacity-50 rounded" />
            <span>Occupied</span>
          </div>

        </div>

        {/* ==================================================== */}
        {/* SEATS */}
        {/* ==================================================== */}

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

        {/* ==================================================== */}
        {/* SELECTED SEATS */}
        {/* ==================================================== */}

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

          {/* ================================================== */}
          {/* CHECKOUT BUTTON */}
          {/* ================================================== */}

          <button
            onClick={handleCheckout}
            className="
              flex
              items-center
              justify-center
              gap-2
              px-8
              py-3
              text-sm
              bg-primary
              hover:bg-primary-dull
              transition
              rounded-full
              font-medium
              cursor-pointer
              active:scale-95
            "
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

