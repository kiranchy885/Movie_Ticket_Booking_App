import { ArrowRight } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BlurCircle from "./BlurCircle";
import MovieCard from "./MovieCard";

const FeaturedSection = () => {
  const navigate = useNavigate();

  const [featuredMovies, setFeaturedMovies] = useState([]);

  // ============================================
  // LOAD ADMIN-ADDED SHOWS FROM DATABASE
  // ============================================

  useEffect(() => {
    const fetchFeaturedMovies = async () => {
      try {
        // ============================================
        // GET SHOWS FROM MONGODB
        // ============================================

        const response = await fetch(
          "http://localhost:5000/show/all"
        );

        const data = await response.json();

        console.log(
          "Shows from database:",
          data
        );

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Failed to fetch shows"
          );
        }

        // ============================================
        // GET MOVIES FROM SHOW DATA
        // ============================================
        //
        // Each show contains:
        //
        // show.movie
        //
        // because backend uses:
        //
        // .populate("movie")
        //
        // ============================================

        const movies = data.shows
          .map((show) => show.movie)
          .filter(Boolean);

        console.log(
          "Movies from database:",
          movies
        );

        // ============================================
        // REMOVE DUPLICATE MOVIES
        // ============================================

        const uniqueMovies =
          movies.filter(
            (movie, index, self) =>
              index ===
              self.findIndex(
                (item) =>
                  String(item._id) ===
                  String(movie._id)
              )
          );

        // ============================================
        // LATEST ADDED SHOW FIRST
        // ============================================

        uniqueMovies.reverse();

        // ============================================
        // SHOW ONLY 4 MOVIES
        // ============================================

        setFeaturedMovies(
          uniqueMovies.slice(0, 4)
        );

      } catch (error) {
        console.error(
          "Error loading featured movies:",
          error
        );

        setFeaturedMovies([]);

      }
    };

    fetchFeaturedMovies();
  }, []);

  // ============================================
  // PAGE
  // ============================================

  return (
    <div className="px-6 md:px-16 lg:px-24 xl:px-44 pt-0 pb-12 overflow-hidden">

      {/* ========================================= */}
      {/* SECTION HEADER */}
      {/* ========================================= */}

      <div className="relative flex items-center justify-between pt-16 pb-6">

        <BlurCircle
          top="0"
          right="-80px"
        />

        <p className="text-gray-300 font-medium text-lg">
          Now Showing
        </p>

        <button
          onClick={() =>
            navigate("/movies")
          }
          className="group flex items-center gap-2 text-sm 
          text-gray-300 cursor-pointer"
        >
          View All

          <ArrowRight
            className="group-hover:translate-x-0.5 transition w-4.5 h-4.5"
          />
        </button>

      </div>

      {/* ========================================= */}
      {/* MOVIES */}
      {/* ========================================= */}

      {featuredMovies.length > 0 ? (

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-8">

          {featuredMovies.map(
            (movie) => (

              <MovieCard
                key={movie._id}
                movie={movie}
              />

            )
          )}

        </div>

      ) : (

        <div className="flex justify-center items-center py-20">

          <p className="text-gray-500">
            No shows available
          </p>

        </div>

      )}

      {/* ========================================= */}
      {/* SHOW MORE */}
      {/* ========================================= */}

      {featuredMovies.length > 0 && (

        <div className="flex justify-center mt-8 mb-0">

          <button
            onClick={() => {
              navigate("/movies");
              scroll(0, 0);
            }}
            className="px-10 py-3 text-sm bg-primary 
            hover:bg-primary-dull transition rounded-md 
            font-medium cursor-pointer"
          >
            Show more
          </button>

        </div>

      )}

    </div>
  );
};

export default FeaturedSection;