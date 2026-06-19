import React, { useState, useEffect } from "react";
import Title from "../../components/admin/Title";
import Loading from "../../components/Loading";
import { dummyBookingData } from "../../assets/assets";

const ListBookings = () => {
  const currency = import.meta.env.VITE_CURRENCY || "Rs.";

  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const getAllBookings = async () => {
    setBookings(dummyBookingData);
    setIsLoading(false);
  };

  useEffect(() => {
    getAllBookings();
  }, []);

  // Date formatting function
  const dateFormat = (date) => {
    return new Date(date).toLocaleString();
  };

  return !isLoading ? (
    <>
      <Title text1="List" text2="Bookings" />

      <div className="max-w-4xl mt-6 overflow-x-auto">
            <table className="w-full border-collapse rounded-md overflow-hidden
            text-nowrap">
                <thead>
                    <tr className="bg-primary/20 text-left text-white">
                    <th className="p-2 font-medium pl-5">User Name</th>
                    <th className="p-2 font-medium">Movie Name</th>
                    <th className="p-2 font-medium">Show Time</th>
                    <th className="p-2 font-medium">Seats</th>
                    <th className="p-2 font-medium">Amount</th>

                    </tr>
                </thead>

          {/* BODY */}
          <tbody className="text-sm">
            {bookings.length > 0 ? (
              bookings.map((item, index) => (
                <tr
                  key={index}
                  className="border-b border-primary/20 bg-primary/5 hover:bg-primary/10 transition"
                >
                  <td className="p-4 text-center">
                    {item.user?.name}
                  </td>

                  <td className="p-4 text-center">
                    {item.show?.movie?.title}
                  </td>

                  <td className="p-4 text-center">
                    {dateFormat(item.show?.showDateTime)}
                  </td>

                  <td className="p-4 text-center">
                    {item.bookedSeats
                      ? Object.values(item.bookedSeats).join(", ")
                      : "-"}
                  </td>

                  <td className="p-4 text-center">
                    {currency}
                    {item.amount}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="5"
                  className="text-center py-6 text-gray-400"
                >
                  No bookings found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  ) : (
    <Loading />
  );
};

export default ListBookings;