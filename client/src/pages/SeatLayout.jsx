import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { assets } from "../assets/assets";
import { ArrowRightIcon, ClockIcon } from "lucide-react";
import BlurCircle from "../components/BlurCircle";
import { toast } from "react-toastify";
import axios from "axios";
import { useAppContext } from "../context/AppContext";

const SeatLayout = () => {
  // ============================================================
  // SEAT ROWS
  // ============================================================

  const groupRows = [
    ["A", "B"],
    ["C", "D"],
    ["E", "F"],
    ["G", "H"],
    ["I", "J"],
  ];

  // ============================================================
  // URL PARAMETERS
  // Example:
  // /movies/986056/2026-03-15
  // ============================================================

  const { id, date } = useParams();

  const navigate = useNavigate();

  // ============================================================
  // APP CONTEXT
  // ============================================================

  const { getToken, user } = useAppContext();

  // ============================================================
  // STATES
  // ============================================================

  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [show, setShow] = useState(null);

  // Seats already booked
  const [occupiedSeats, setOccupiedSeats] = useState([]);

  const [loading, setLoading] = useState(true);

  // ============================================================
  // GET SHOW DATA
  // ============================================================

  const getShow = async () => {
    try {
      setLoading(true);

      console.log("=================================");
      console.log("Getting show information");
      console.log("Movie ID:", id);
      console.log("Date:", date);
      console.log("=================================");

      if (!id) {
        console.error("Movie ID is missing");
        toast.error("Movie ID is missing");
        return;
      }

      // IMPORTANT:
      // Your backend must run on port 5000.
      //
      // If your backend runs on port 3000 instead,
      // change 5000 to 3000 here.
      //
      const response = await axios.get(
        `http://localhost:5000/api/show/${id}`
      );

      console.log("Show API response:", response.data);

      const data = response.data;

      if (data.success) {
        setShow(data);
      } else {
        console.error(
          "Show API failed:",
          data.message
        );

        toast.error(
          data.message || "Unable to load show"
        );

        setShow(null);
      }

    } catch (error) {
      console.error(
        "Error getting show:",
        error.response?.data || error.message
      );

      if (error.response?.status === 404) {
        toast.error(
          "Show API route not found. Check your backend route."
        );
      } else {
        toast.error("Unable to load show");
      }

      setShow(null);

    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // GET OCCUPIED SEATS
  // ============================================================

  const getOccupiedSeats = async (showId) => {
    try {
      if (!showId) {
        console.log("No show ID provided");
        return;
      }

      console.log(
        "Getting occupied seats for:",
        showId
      );

      const response = await axios.get(
        `http://localhost:5000/api/booking/occupied-seats/${showId}`
      );

      console.log(
        "Occupied seats response:",
        response.data
      );

      const data = response.data;

      if (data.success) {
        setOccupiedSeats(
          data.occupiedSeats || []
        );
      } else {
        setOccupiedSeats([]);
      }

    } catch (error) {
      console.error(
        "Error getting occupied seats:",
        error.response?.data || error.message
      );

      // Do not crash the page if occupied-seat API fails
      setOccupiedSeats([]);
    }
  };

  // ============================================================
  // LOAD SHOW WHEN MOVIE ID CHANGES
  // ============================================================

  useEffect(() => {
    if (id) {
      getShow();
    }
  }, [id]);

  // ============================================================
  // WHEN USER SELECTS SHOW TIME
  // GET OCCUPIED SEATS
  // ============================================================

  useEffect(() => {
    if (selectedTime?.showId) {
      getOccupiedSeats(
        selectedTime.showId
      );

      // Clear seats from previous show time
      setSelectedSeats([]);
    }
  }, [selectedTime]);

  // ============================================================
  // SELECT / UNSELECT SEAT
  // ============================================================

  const handleSeatClick = (seatId) => {

    // User must select time first
    if (!selectedTime) {
      toast.warning(
        "Please select time first"
      );
      return;
    }

    // Prevent occupied seat
    if (occupiedSeats.includes(seatId)) {
      toast.error(
        `${seatId} is already occupied`
      );
      return;
    }

    // Maximum 5 seats
    if (
      !selectedSeats.includes(seatId) &&
      selectedSeats.length >= 5
    ) {
      toast.warning(
        "You can only select 5 seats"
      );
      return;
    }

    // Select / unselect
    setSelectedSeats((prev) => {

      if (prev.includes(seatId)) {

        // Remove seat
        return prev.filter(
          (seat) => seat !== seatId
        );

      } else {

        // Add seat
        return [
          ...prev,
          seatId,
        ];
      }
    });
  };

  // ============================================================
  // RENDER SEATS
  // ============================================================

  const renderSeats = (
    row,
    count = 9
  ) => {

    return (
      <div
        key={row}
        className="flex gap-2 mt-2"
      >
        <div className="flex flex-wrap items-center justify-center gap-2">

          {Array.from(
            { length: count },
            (_, i) => {

              const seatId =
                `${row}${i + 1}`;

              const isOccupied =
                occupiedSeats.includes(
                  seatId
                );

              const isSelected =
                selectedSeats.includes(
                  seatId
                );

              return (
                <button
                  key={seatId}
                  type="button"
                  disabled={isOccupied}
                  onClick={() =>
                    handleSeatClick(
                      seatId
                    )
                  }
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
            }
          )}

        </div>
      </div>
    );
  };

  // ============================================================
  // PROCEED TO CHECKOUT
  // ============================================================

  const handleCheckout = async () => {

    // ----------------------------------------------------------
    // CHECK LOGIN
    // ----------------------------------------------------------

    if (!user) {
      toast.warning(
        "Please login before booking"
      );
      return;
    }

    // ----------------------------------------------------------
    // CHECK SHOW TIME
    // ----------------------------------------------------------

    if (!selectedTime) {
      toast.warning(
        "Please select a show time"
      );
      return;
    }

    // ----------------------------------------------------------
    // CHECK SEATS
    // ----------------------------------------------------------

    if (selectedSeats.length === 0) {
      toast.warning(
        "Please select at least one seat"
      );
      return;
    }

    // ----------------------------------------------------------
    // DOUBLE CHECK OCCUPIED SEATS
    // ----------------------------------------------------------

    const alreadyOccupied =
      selectedSeats.filter(
        (seat) =>
          occupiedSeats.includes(seat)
      );

    if (
      alreadyOccupied.length > 0
    ) {
      toast.error(
        `These seats are already occupied: ${alreadyOccupied.join(
          ", "
        )}`
      );
      return;
    }

    // ----------------------------------------------------------
    // CHECK SHOW DATA
    // ----------------------------------------------------------

    if (!show) {
      toast.error(
        "Show information is not available"
      );
      return;
    }

    // ----------------------------------------------------------
    // CHECK MOVIE DATA
    // ----------------------------------------------------------

    const movie = show.movie;

    if (!movie) {
      toast.error(
        "Movie information is missing"
      );

      console.error(
        "Movie information missing from show response:",
        show
      );

      return;
    }

    try {

      // --------------------------------------------------------
      // GET AUTH TOKEN
      // --------------------------------------------------------

      const token = await getToken();

      if (!token) {
        toast.error(
          "Authentication token not found. Please login again."
        );
        return;
      }

      // --------------------------------------------------------
      // SHOW PRICE
      // --------------------------------------------------------

      const showPrice =
        Number(
          selectedTime.showPrice
        ) ||
        Number(
          selectedTime.price
        ) ||
        Number(
          movie.showPrice
        ) ||
        Number(
          movie.price
        ) ||
        200;

      // --------------------------------------------------------
      // TOTAL AMOUNT
      // --------------------------------------------------------

      const totalAmount =
        showPrice *
        selectedSeats.length;

      // --------------------------------------------------------
      // BOOKING DATA
      // --------------------------------------------------------

      const bookingData = {

        showId:
          selectedTime.showId,

        movieId:
          movie._id,

        movie:
          movie.title,

        poster_path:
          movie.poster_path,

        date:
          date,

        time:
          selectedTime.time,

        seats:
          selectedSeats,

        amount:
          totalAmount,

        runtime:
          movie.runtime,
      };

      console.log(
        "================================="
      );

      console.log(
        "Sending booking:"
      );

      console.log(
        bookingData
      );

      console.log(
        "================================="
      );

      // --------------------------------------------------------
      // CREATE BOOKING
      // --------------------------------------------------------

      const response =
        await axios.post(
          "http://localhost:5000/api/booking/create",
          bookingData,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,

              "Content-Type":
                "application/json",
            },
          }
        );

      console.log(
        "Booking response:",
        response.data
      );

      const data =
        response.data;

      // --------------------------------------------------------
      // BOOKING SUCCESS
      // --------------------------------------------------------

      if (data.success) {

        toast.success(
          "Booking created successfully!"
        );

        // Update occupied seats immediately
        setOccupiedSeats(
          (prev) => [
            ...prev,
            ...selectedSeats,
          ]
        );

        // Clear selected seats
        setSelectedSeats([]);

        // Navigate to My Booking
        navigate(
          "/my-booking"
        );

      } else {

        toast.error(
          data.message ||
            "Booking failed"
        );
      }

    } catch (error) {

      console.error(
        "Booking error:",
        error.response?.data ||
          error.message
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

  if (loading) {

    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <p>
          Loading show...
        </p>
      </div>
    );
  }

  // ============================================================
  // SHOW NOT FOUND
  // ============================================================

  if (!show) {

    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white gap-4">

        <p className="text-xl">
          Unable to load show information.
        </p>

        <p className="text-gray-400">
          Movie ID: {id}
        </p>

        <button
          onClick={() =>
            navigate(-1)
          }
          className="bg-primary px-6 py-2 rounded-full"
        >
          Go Back
        </button>

      </div>
    );
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="flex flex-col md:flex-row px-6 md:px-16 lg:px-40 pt-40">

      {/* ======================================================
          TIMING SECTION
      ====================================================== */}

      <div className="w-60 bg-primary/10 border border-primary/20 rounded-lg py-10">

        <p className="text-lg font-semibold px-6">
          Available Timings
        </p>

        <div className="mt-5 space-y-2">

          {show?.dateTime?.[date]?.length > 0 ? (

            show.dateTime[date].map(
              (item, index) => (

                <div
                  key={
                    item.showId ||
                    index
                  }
                  onClick={() => {

                    setSelectedTime(
                      item
                    );

                    setSelectedSeats(
                      []
                    );
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
                      selectedTime?.showId ===
                      item.showId
                        ? "bg-primary text-white"
                        : "hover:bg-primary/20"
                    }
                  `}
                >

                  <ClockIcon
                    className="w-4 h-4"
                  />

                  <p className="text-sm">

                    {new Date(
                      item.time
                    ).toLocaleTimeString(
                      [],
                      {
                        hour: "2-digit",
                        minute:
                          "2-digit",
                      }
                    )}

                  </p>

                </div>
              )
            )

          ) : (

            <p className="px-6 text-gray-400 text-sm">
              No show times available for this date.
            </p>

          )}

        </div>
      </div>

      {/* ======================================================
          SEAT LAYOUT
      ====================================================== */}

      <div className="relative flex-1 flex flex-col items-center max-md:mt-16">

        <BlurCircle
          top="-100px"
          left="-100px"
        />

        <BlurCircle
          right="0"
        />

        <h1 className="text-2xl font-semibold mb-4">
          Select Your Seat
        </h1>

        {/* SCREEN */}

        <img
          src={assets.screenImage}
          alt="screen"
          className="max-w-full"
        />

        <p className="text-gray-400 text-sm mb-6">
          SCREEN SIDE
        </p>

        {/* ====================================================
            SEAT LEGEND
        ==================================================== */}

        <div className="flex gap-6 mb-6 text-sm">

          {/* AVAILABLE */}

          <div className="flex items-center gap-2">

            <div className="w-5 h-5 border border-primary/60 rounded" />

            <span>
              Available
            </span>

          </div>

          {/* SELECTED */}

          <div className="flex items-center gap-2">

            <div className="w-5 h-5 bg-primary rounded" />

            <span>
              Selected
            </span>

          </div>

          {/* OCCUPIED */}

          <div className="flex items-center gap-2">

            <div className="w-5 h-5 bg-gray-700 opacity-50 rounded" />

            <span>
              Occupied
            </span>

          </div>

        </div>

        {/* ====================================================
            SEATS
        ==================================================== */}

        <div className="flex flex-col items-center mt-10 text-xs text-gray-300">

          {groupRows.map(
            (group, index) => (

              <div
                key={index}
                className="grid grid-cols-2 gap-8 mb-4"
              >

                {group.map(
                  (row) =>
                    renderSeats(row)
                )}

              </div>
            )
          )}

        </div>

        {/* ====================================================
            SELECTED SEATS
        ==================================================== */}

        <div className="mt-8 flex flex-col items-center">

          <p className="text-white text-lg mb-2">

            Selected Seats:{" "}

            {selectedSeats.length >
            0
              ? selectedSeats.join(
                  ", "
                )
              : "None"}

          </p>

          <p className="text-gray-400 text-sm mb-4">

            Total Seats:{" "}
            {selectedSeats.length}

          </p>

          {/* ==================================================
              CHECKOUT BUTTON
          ================================================== */}

          <button
            onClick={
              handleCheckout
            }
            disabled={
              !selectedTime ||
              selectedSeats.length === 0
            }
            className={`
              flex
              items-center
              justify-center
              gap-2
              px-8
              py-3
              text-sm
              transition
              rounded-full
              font-medium
              active:scale-95

              ${
                !selectedTime ||
                selectedSeats.length === 0
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-primary hover:bg-primary-dull cursor-pointer text-white"
              }
            `}
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