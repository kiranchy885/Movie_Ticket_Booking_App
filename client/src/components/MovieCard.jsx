import React from "react";
import { useNavigate } from "react-router-dom";
import timeFormat from "../lib/timeFormat";
import { Star } from "lucide-react";

const MovieCard = ({ movie }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/movies/${movie._id}`);
    window.scrollTo(0, 0);
  };

  return (
    <div
      className="flex flex-col justify-between p-3 bg-gray-800 rounded-2xl
      hover:-translate-y-1 transition duration-300 w-66"
    >
      <img
        onClick={handleClick}
        src={movie.backdrop_path}
        alt={movie.title}
        className="rounded-lg h-52 w-full object-cover cursor-pointer"
      />

      <h3 className="font-semibold mt-3">{movie.title}</h3>

      <p className="text-sm text-gray-400 mt-2">
        {new Date(movie.release_date).getFullYear()} ·{" "}
        {movie.genres.slice(0, 2).map((genre) => genre.name).join(" | ")} ·{" "}
        {timeFormat(movie.runtime)}
      </p>

      <div className="flex items-center justify-between mt-4 pb-3">
        <button
          onClick={handleClick}
          className="px-4 py-2 text-xs bg-primary hover:bg-primary-dull
          transition rounded-full font-medium cursor-pointer"
        >
          Buy Tickets
        </button>

        <p className="flex items-center gap-1 text-sm text-gray-400 mt-1 pe-1">
          <Star className="w-4 h-4 text-primary fill-primary" />
          {movie.vote_average.toFixed(1)}
        </p>
      </div>
    </div>
  );
};

export default MovieCard;