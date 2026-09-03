
import React from "react";
import { useNavigate } from "react-router-dom";
import timeFormat from "../lib/timeFormat";
import { Star } from "lucide-react";

const MovieCard = ({ movie }) => {

    const navigate = useNavigate();

    // =====================================================
    // GET MOVIE ID
    // =====================================================

    const movieId = String(
        movie?._id ||
        movie?.id ||
        ""
    );


    // =====================================================
    // BUY TICKETS
    // =====================================================

    const handleBuyTickets = () => {

        if (!movieId) {

            console.error(
                "Movie ID is missing:",
                movie
            );

            alert(
                "Movie ID not found."
            );

            return;
        }


        console.log(
            "Opening Movie Detail:",
            movieId
        );


        // =================================================
        // OPEN MOVIE DETAIL PAGE
        // =================================================

        navigate(
            `/movies/${movieId}`
        );


        // =================================================
        // SCROLL TO TOP
        // =================================================

        window.scrollTo(
            0,
            0
        );
    };


    return (

        <div
            className="
                flex
                flex-col
                bg-gray-800
                rounded-2xl
                overflow-hidden
                hover:-translate-y-1
                transition
                duration-300
                w-full
                shadow-lg
            "
        >

            {/* ================================================= */}
            {/* MOVIE POSTER */}
            {/* ================================================= */}

            <img
                src={
                    movie?.poster_path
                        ? movie.poster_path.startsWith("http")
                            ? movie.poster_path
                            : `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                        : "/fallback.jpg"
                }
                alt={
                    movie?.title ||
                    "Movie"
                }
                className="
                    w-full
                    h-64
                    object-fill
                "
            />


            {/* ================================================= */}
            {/* MOVIE INFORMATION */}
            {/* ================================================= */}

            <div
                className="
                    p-4
                    flex
                    flex-col
                    grow
                "
            >

                {/* ================================================= */}
                {/* TITLE */}
                {/* ================================================= */}

                <h3
                    className="
                        text-lg
                        font-semibold
                        text-white
                        truncate
                    "
                >
                    {movie?.title ||
                        movie?.name ||
                        "Untitled Movie"}
                </h3>


                {/* ================================================= */}
                {/* MOVIE DETAILS */}
                {/* ================================================= */}

                <p
                    className="
                        text-sm
                        text-gray-400
                        mt-2
                    "
                >

                    {movie?.release_date
                        ? new Date(
                              movie.release_date
                          ).getFullYear()
                        : "N/A"}

                    {" • "}

                    {movie?.genres
                        ?.slice(0, 2)
                        .map(
                            (genre) =>
                                genre?.name
                        )
                        .filter(Boolean)
                        .join(" | ")}

                    {" • "}

                    {movie?.runtime
                        ? timeFormat(
                              movie.runtime
                          )
                        : "N/A"}

                </p>


                {/* ================================================= */}
                {/* BOTTOM */}
                {/* ================================================= */}

                <div
                    className="
                        flex
                        items-center
                        justify-between
                        mt-4
                    "
                >

                    {/* ================================================= */}
                    {/* BUY TICKETS */}
                    {/* ================================================= */}

                    <button
                        type="button"
                        onClick={
                            handleBuyTickets
                        }
                        disabled={!movieId}
                        className={`
                            px-4
                            py-2
                            text-xs
                            transition
                            rounded-full
                            font-medium
                            active:scale-95
                            ${
                                movieId
                                    ? `
                                        bg-primary
                                        hover:bg-primary-dull
                                        cursor-pointer
                                    `
                                    : `
                                        bg-gray-600
                                        cursor-not-allowed
                                    `
                            }
                        `}
                    >
                        Buy Tickets
                    </button>


                    {/* ================================================= */}
                    {/* RATING */}
                    {/* ================================================= */}

                    <p
                        className="
                            flex
                            items-center
                            gap-1
                            text-sm
                            text-gray-300
                        "
                    >

                        <Star
                            className="
                                w-4
                                h-4
                                text-primary
                                fill-primary
                            "
                        />

                        {movie?.vote_average
                            ? Number(
                                  movie.vote_average
                              ).toFixed(1)
                            : "N/A"}

                    </p>

                </div>

            </div>

        </div>

    );
};

export default MovieCard;