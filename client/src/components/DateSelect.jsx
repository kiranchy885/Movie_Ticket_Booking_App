import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const DateSelect = ({ dates = [] }) => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [selectedDate, setSelectedDate] = useState(
    dates.length > 0 ? dates[0] : ""
  );

  const handleDateClick = (date) => {
    setSelectedDate(date);

    console.log("Selected movie ID:", id);
    console.log("Selected date:", date);

    // IMPORTANT:
    // This URL must match the SeatLayout route in App.jsx
    navigate(`/movies/${id}/${date}`);
  };

  return (
    <div className="flex flex-wrap gap-3">
      {dates.map((date) => (
        <button
          key={date}
          type="button"
          onClick={() => handleDateClick(date)}
          className={`px-4 py-2 rounded-lg border ${
            selectedDate === date
              ? "bg-primary text-white"
              : "bg-gray-800 text-white"
          }`}
        >
          {date}
        </button>
      ))}
    </div>
  );
};

export default DateSelect;