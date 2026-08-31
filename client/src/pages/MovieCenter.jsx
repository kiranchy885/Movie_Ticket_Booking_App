import React, {
  useEffect,
  useState,
} from "react";

import axios from "axios";

const MovieCenters = () => {
  const [centers, setCenters] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const getLocation =
    () => {
      if (!navigator.geolocation) {
        setError(
          "Geolocation is not supported by your browser."
        );

        setLoading(false);

        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const latitude =
              position.coords.latitude;

            const longitude =
              position.coords.longitude;

            const { data } =
              await axios.get(
                "/api/center/nearest",
                {
                  params: {
                    latitude,
                    longitude,
                  },
                }
              );

            if (data.success) {
              setCenters(
                data.centers
              );
            } else {
              setError(
                data.message
              );
            }
          } catch (error) {
            console.error(error);

            setError(
              error.response?.data
                ?.message ||
                "Unable to find movie centers."
            );
          } finally {
            setLoading(false);
          }
        },

        (error) => {
          console.error(error);

          setError(
            "Please allow location access to find nearby movie centers."
          );

          setLoading(false);
        }
      );
    };

  useEffect(() => {
    getLocation();
  }, []);

  return (
    <div className="min-h-screen pt-32 px-6 md:px-16 lg:px-40">
      <h1 className="text-3xl font-semibold mb-8">
        Nearest Movie Centers
      </h1>

      {loading && (
        <p className="text-gray-400">
          Finding nearby movie centers...
        </p>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg text-red-400">
          {error}

          <button
            onClick={() => {
              setLoading(true);
              setError("");
              getLocation();
            }}
            className="block mt-3 bg-primary px-5 py-2 rounded-full text-white"
          >
            Try Again
          </button>
        </div>
      )}

      {!loading &&
        !error &&
        centers.length === 0 && (
          <p className="text-gray-400">
            No movie centers found.
          </p>
        )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {centers.map(
          (center, index) => (
            <div
              key={center._id}
              className="bg-primary/10 border border-primary/20 rounded-xl p-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  {center.name}
                </h2>

                {index === 0 && (
                  <span className="text-xs bg-primary px-3 py-1 rounded-full">
                    Nearest
                  </span>
                )}
              </div>

              <p className="text-gray-400 mt-3">
                {center.address}
              </p>

              <p className="text-gray-400 mt-1">
                {center.city}
              </p>

              <p className="text-primary font-semibold mt-4">
                📍 {center.distance} km away
              </p>

              {center.phone && (
                <p className="text-gray-400 mt-2">
                  📞 {center.phone}
                </p>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default MovieCenters;