import React, { useState, useEffect, useMemo } from "react";
import BlurCircle from "./BlurCircle";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPin,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

// =====================================================
// HELPERS
// =====================================================

// Convert a showDateTime to a "YYYY-MM-DD" string (local time)
const toDateKey = (dt) => {
  const d = new Date(dt);
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Resolve theater info from a show document
const resolveTheater = (show) => {
  if (show.theaterId && typeof show.theaterId === "object") {
    return {
      _id: show.theaterId._id || show.theaterId.id,
      name: show.theaterId.name || "",
      city: show.theaterId.city || "",
      address: show.theaterId.address || "",
    };
  }
  if (show.theater && typeof show.theater === "object") {
    return {
      _id: show.theater._id || show.theater.id,
      name: show.theater.name || "",
      city: show.theater.city || "",
      address: show.theater.address || "",
    };
  }
  if (show.theaterName) {
    return {
      _id: show.theaterId || show.theaterName,
      name: show.theaterName,
      city: show.theaterCity || "",
      address: show.theaterAddress || "",
    };
  }
  return null;
};

const DateSelect = ({ id }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [selected, setSelected] = useState(null);           // selected date (YYYY-MM-DD)
  const [selectedTheater, setSelectedTheater] = useState(null); // selected theater object
  const [shows, setShows] = useState([]);
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================================
  // FETCH SHOWS FROM DATABASE
  // =========================================
  useEffect(() => {
    const fetchShows = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await axios.get(`http://localhost:5000/show/${id}`);
        if (response.data.success) {
          const fetchedShows = response.data.shows || [];
          setShows(fetchedShows);

          // Extract unique dates from showDateTime
          const uniqueDates = [
            ...new Set(
              fetchedShows.map((show) => toDateKey(show.showDateTime))
            ),
          ]
            .filter(Boolean)
            .sort((a, b) => new Date(a) - new Date(b));

          setDates(uniqueDates);
        } else {
          setError(response.data.message || "Unable to load shows.");
        }
      } catch (err) {
        console.error("Fetch shows error:", err);
        setError("Unable to load show dates.");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchShows();
  }, [id]);

  // =========================================
  // THEATERS FOR THE SELECTED DATE
  // =========================================
  const theatersForDate = useMemo(() => {
    if (!selected) return [];

    const map = new Map();

    shows.forEach((show) => {
      if (toDateKey(show.showDateTime) !== selected) return;

      const theater = resolveTheater(show);
      if (!theater || !theater.name) return;

      const key = theater._id || theater.name;
      if (!map.has(key)) {
        map.set(key, {
          ...theater,
          shows: [],
        });
      }
      map.get(key).shows.push(show);
    });

    // Sort alphabetically by theater name
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [shows, selected]);

  // Auto-select the first theater if there's only one
  useEffect(() => {
    if (theatersForDate.length === 1) {
      setSelectedTheater(theatersForDate[0]);
    } else {
      // Reset if the current selection isn't in the new list
      setSelectedTheater((prev) =>
        prev &&
        theatersForDate.some(
          (t) => (t._id || t.name) === (prev._id || prev.name)
        )
          ? prev
          : null
      );
    }
  }, [theatersForDate]);

  // =========================================
  // BOOK NOW & USER AUTH CHECK
  // =========================================
  const onBookHandler = () => {
    if (!selected) {
      toast.warn("Please select a date");
      return;
    }

    if (!selectedTheater) {
      toast.warn("Please select a theater");
      return;
    }

    // Strict check for logged-in user
    if (!user) {
      toast.error("Please log in to book tickets");
      navigate("/login", {
        state: {
          from: `/movies/${id}/${selected}?theater=${selectedTheater._id}`,
        },
      });
      return;
    }

    console.log("Selected movie ID:", id);
    console.log("Selected date:", selected);
    console.log("Selected theater:", selectedTheater);

    // Pass theater + user info to the next page (time slot selection)
    navigate(`/movies/${id}/${selected}`, {
      state: {
        // theater context
        theaterId: selectedTheater._id,
        theaterName: selectedTheater.name,
        theaterCity: selectedTheater.city,
        theaterAddress: selectedTheater.address,

        // user context
        userId: user._id || user.id,
        userEmail: user.email,
        userName: user.name || user.username,
      },
    });

    window.scrollTo(0, 0);
  };

  // =========================================
  // LOADING / ERROR / EMPTY STATES
  // =========================================
  if (loading) {
    return (
      <div id="dateSelect" className="pt-30">
        <div className="relative p-8 bg-primary/10 border border-primary/20 rounded-lg">
          <BlurCircle top="-100px" left="-100px" />
          <BlurCircle top="100px" right="0px" />
          <p className="text-lg font-semibold">Choose Date & Theater</p>
          <p className="text-gray-400 mt-4">Loading show dates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div id="dateSelect" className="pt-30">
        <div className="relative p-8 bg-primary/10 border border-primary/20 rounded-lg">
          <BlurCircle top="-100px" left="-100px" />
          <BlurCircle top="100px" right="0px" />
          <p className="text-lg font-semibold">Choose Date & Theater</p>
          <p className="text-red-400 mt-4">{error}</p>
        </div>
      </div>
    );
  }

  if (dates.length === 0) {
    return (
      <div id="dateSelect" className="pt-30">
        <div className="relative p-8 bg-primary/10 border border-primary/20 rounded-lg">
          <BlurCircle top="-100px" left="-100px" />
          <BlurCircle top="100px" right="0px" />
          <p className="text-lg font-semibold">Choose Date & Theater</p>
          <p className="text-gray-400 mt-4">
            No shows are available for this movie.
          </p>
        </div>
      </div>
    );
  }

  // =========================================
  // PAGE RENDER
  // =========================================
  return (
    <div id="dateSelect" className="pt-30">
      <div
        className="
          flex
          flex-col
          gap-8
          relative
          p-8
          bg-primary/10
          border
          border-primary/20
          rounded-lg
        "
      >
        <BlurCircle top="-100px" left="-100px" />
        <BlurCircle top="100px" right="0px" />

        {/* ========================================= */}
        {/* DATE SELECTION */}
        {/* ========================================= */}
        <div>
          <p className="text-lg font-semibold">Choose Date</p>

          <div className="flex items-center gap-6 text-sm mt-5">
            <ChevronLeftIcon width={28} className="text-gray-400" />

            <div
              className="
                grid
                grid-cols-3
                md:flex
                flex-wrap
                md:max-w-lg
                gap-4
              "
            >
              {dates.map((date) => {
                const dateObject = new Date(`${date}T00:00:00`);
                const day = dateObject.getDate();
                const month = dateObject.toLocaleDateString("en-US", {
                  month: "short",
                });
                const isSelected = selected === date;

                return (
                  <button
                    type="button"
                    key={date}
                    onClick={() => {
                      setSelected(date);
                      setSelectedTheater(null); // reset theater on date change
                    }}
                    className={`
                      flex
                      flex-col
                      items-center
                      justify-center
                      h-14
                      w-14
                      aspect-square
                      rounded
                      cursor-pointer
                      transition-all
                      ${
                        isSelected
                          ? "bg-primary text-white"
                          : "border border-primary/70 hover:bg-primary/20"
                      }
                    `}
                  >
                    <span className="font-medium">{day}</span>
                    <span>{month}</span>
                  </button>
                );
              })}
            </div>

            <ChevronRightIcon width={28} className="text-gray-400" />
          </div>
        </div>

        {/* ========================================= */}
        {/* THEATER SELECTION */}
        {/* ========================================= */}
        {selected && (
          <div>
            <p className="text-lg font-semibold">Choose Theater</p>

            {theatersForDate.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
                {theatersForDate.map((theater) => {
                  const key = theater._id || theater.name;
                  const isSelected =
                    (selectedTheater?._id || selectedTheater?.name) === key;

                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setSelectedTheater(theater)}
                      className={`
                        text-left
                        p-4
                        rounded-lg
                        transition-all
                        cursor-pointer
                        border
                        ${
                          isSelected
                            ? "bg-primary/30 border-primary"
                            : "border-primary/40 hover:bg-primary/20"
                        }
                      `}
                    >
                      <div className="flex items-start gap-2">
                        <MapPin
                          size={16}
                          className="text-primary flex-shrink-0 mt-0.5"
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate">
                            {theater.name}
                          </p>
                          {(theater.city || theater.address) && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">
                              {theater.city && `${theater.city}, `}
                              {theater.address}
                            </p>
                          )}
                          <p className="text-[11px] text-gray-500 mt-1">
                            {theater.shows.length}{" "}
                            {theater.shows.length === 1
                              ? "show"
                              : "shows"}{" "}
                            available
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-400 text-sm mt-4">
                No theaters have shows on this date.
              </p>
            )}
          </div>
        )}

        {/* ========================================= */}
        {/* BOOK NOW */}
        {/* ========================================= */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onBookHandler}
            disabled={!selected || !selectedTheater}
            className={`
              px-10
              py-3
              text-sm
              rounded-md
              font-medium
              transition
              ${
                selected && selectedTheater
                  ? "bg-primary hover:bg-primary-dull cursor-pointer active:scale-95"
                  : "bg-primary/30 text-white/60 cursor-not-allowed"
              }
            `}
          >
            Book Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default DateSelect;