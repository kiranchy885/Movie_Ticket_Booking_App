import React, { useEffect, useState } from "react";
import BlurCircle from "../components/BlurCircle";
import MovieCard from "../components/MovieCard";

// HELPER: resolve theater info from a show
const resolveTheater = (show) => {
    if (show.theaterId && typeof show.theaterId === "object") {
        return {
            name: show.theaterId.name || "",
            city: show.theaterId.city || "",
            address: show.theaterId.address || "",
        };
    }
    if (show.theaterName) {
        return {
            name: show.theaterName,
            city: show.theaterCity || "",
            address: show.theaterAddress || "",
        };
    }
    if (show.theater && typeof show.theater === "object") {
        return {
            name: show.theater.name || "",
            city: show.theater.city || "",
            address: show.theater.address || "",
        };
    }
    return null;
};

const Movies = () => {

    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);


    // FETCH ADMIN-ADDED MOVIES FROM MONGODB

    const fetchMovies = async () => {

        try {

            setLoading(true);

            console.log(
                "Fetching admin-added movies from MongoDB..."
            );


            
            // GET ALL SHOWS

            const response = await fetch(
                "http://localhost:5000/show/all"
            );


            if (!response.ok) {

                throw new Error(
                    `Server error: ${response.status}`
                );

            }


            const data = await response.json();


            console.log(
                "Shows received from MongoDB:",
                data
            );


            if (
                !data.success ||
                !Array.isArray(data.shows)
            ) {

                console.error(
                    "Invalid response from server:",
                    data
                );

                setMovies([]);

                return;
            }


            // FILTER: ONLY ACTIVE SHOWS (today onwards)

            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);

            const activeShows = data.shows.filter((show) => {
                const t = new Date(show.showDateTime || show.date);
                if (isNaN(t.getTime())) return false;
                return t >= startOfToday;
            });


            // GROUP MOVIES WITH THEATER + SHOWTIME INFO

            const movieMap = new Map();

            activeShows.forEach((show) => {

                const movie = show.movie;
                if (!movie) return;

                const movieId = movie._id || movie.id;
                if (!movieId) return;

                const id = String(movieId);

                // Build theater object (if available)
                const theater = resolveTheater(show);

                const showTime = new Date(show.showDateTime);
                const showTs = showTime.getTime();

                if (!movieMap.has(id)) {
                    movieMap.set(id, {
                        movie: movie,
                        theaters: [],
                        theaterKeys: new Set(),
                        showDateTimes: [],
                        earliest: showTs,
                    });
                }

                const entry = movieMap.get(id);

                // Add theater if new
                if (theater && theater.name) {
                    const key = `${theater.name}|${theater.city || ""}`;
                    if (!entry.theaterKeys.has(key)) {
                        entry.theaterKeys.add(key);
                        entry.theaters.push(theater);
                    }
                }

                // Add showtime
                entry.showDateTimes.push(showTs);

                // Track earliest show
                if (showTs < entry.earliest) {
                    entry.earliest = showTs;
                }
            });


           // BUILD FINAL MOVIES LIST

            const uniqueMovies = [];

            movieMap.forEach((value) => {

                const movie = value.movie;

                // Sort theaters + showtimes
                const sortedTheaters = [...value.theaters].sort(
                    (a, b) => a.name.localeCompare(b.name)
                );

                const sortedShowDateTimes = [
                    ...value.showDateTimes,
                ].sort((a, b) => a - b);

                uniqueMovies.push({
                    ...movie,
                    _theaters: sortedTheaters,
                    _showDateTimes: sortedShowDateTimes,
                });
            });

            // Sort movies by earliest upcoming show
            uniqueMovies.sort(
                (a, b) =>
                    (a._showDateTimes[0] || 0) -
                    (b._showDateTimes[0] || 0)
            );


            console.log(
                "Unique movies with theater info:",
                uniqueMovies
            );


            // SET MOVIES

            setMovies(uniqueMovies);


        } catch (error) {

            console.error(
                "Error fetching movies from MongoDB:",
                error
            );

            setMovies([]);


        } finally {

            setLoading(false);

        }

    };


    // FETCH WHEN PAGE OPENS

    useEffect(() => {

        fetchMovies();

    }, []);


    // LOADING

    if (loading) {

        return (

            <div className="flex items-center justify-center h-screen">

                <h1 className="text-xl text-gray-300">
                    Loading movies...
                </h1>

            </div>

        );

    }


    // NO MOVIES

    if (movies.length === 0) {

        return (

            <div className="flex flex-col items-center justify-center h-screen">

                <h1 className="text-3xl font-bold text-center text-white">
                    No movies available
                </h1>

                <p className="text-gray-500 mt-2">
                    No movies have been added to a show yet.
                </p>

            </div>

        );

    }


    // MOVIES PAGE

    return (

        <div
            className="
                relative
                my-40
                mb-60
                px-6
                md:px-16
                lg:px-40
                xl:px-44
                overflow-hidden
                min-h-[480vh]
            "
        >


            {/*  */}
            {/* BACKGROUND BLUR CIRCLES */}
            {/*  */}

            <BlurCircle
                top="150px"
                left="0px"
            />


            <BlurCircle
                bottom="50px"
                right="50px"
            />


            {/*  */}
            {/* TITLE */}
            {/*  */}
            <h1 className="text-3xl md:text-4xl font-bold text-white">
                            Total <span className="text-primary">Movies </span>
                        </h1>            

            <h1 className="text-lg font-medium my-4 text-white">

                Now Showing

            </h1>

            <h1 className="text-lg font-medium my-4 text-white">

                

            </h1>
            {/*  */}
            {/* MOVIE GRID */}
            {/*  */}

            <div
                className="
                    grid
                    grid-cols-1
                    sm:grid-cols-2
                    lg:grid-cols-4
                    gap-8
                    mt-8
                "
            >

                {movies.map((movie) => {

                    const movieId =
                        movie._id ||
                        movie.id;


                    return (

                        <MovieCard
                            key={String(movieId)}
                            movie={movie}
                            theaters={movie._theaters}
                            showDateTimes={movie._showDateTimes}
                        />

                    );

                })}

            </div>

        </div>

    );

};


export default Movies;