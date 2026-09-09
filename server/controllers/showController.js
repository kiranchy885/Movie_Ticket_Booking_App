import mongoose from "mongoose";
import Show from "../models/Show.js";
import Movie from "../models/Movie.js";
import Theater from "../models/Theater.js";

// =====================================================
// GET ALL MOVIES
// =====================================================
export const getMovies = async (req, res) => {
    try {
        const movies = await Movie.find().sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            movies,
        });
    } catch (error) {
        console.error("Get Movies Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =====================================================
// ADD MOVIE
// =====================================================
export const addMovie = async (req, res) => {
    try {
        const movieData = req.body;
        const movieId = String(movieData._id || movieData.id || "");
        if (!movieId) {
            return res.status(400).json({
                success: false,
                message: "Movie ID is required",
            });
        }
        const title = movieData.title || movieData.name || "";
        if (!title) {
            return res.status(400).json({
                success: false,
                message: "Movie title is required",
            });
        }

        const existingMovie = await Movie.findById(movieId);
        if (existingMovie) {
            return res.status(200).json({
                success: true,
                message: "Movie already exists",
                movie: existingMovie,
            });
        }

        const movie = await Movie.create({
            _id: movieId,
            title: title,
            overview: movieData.overview || "",
            poster_path: movieData.poster_path || movieData.poster || movieData.image || "",
            backdrop_path: movieData.backdrop_path || movieData.backdrop || "",
            release_date: movieData.release_date || movieData.releaseDate || "",
            original_language: movieData.original_language || "",
            tagline: movieData.tagline || "",
            genres: movieData.genres || movieData.genre_ids || [],
            casts: movieData.casts || movieData.cast || [],
            vote_average: Number(movieData.vote_average) || 0,
            runtime: Number(movieData.runtime) || 0,
        });

        return res.status(201).json({
            success: true,
            message: "Movie added successfully",
            movie,
        });
    } catch (error) {
        console.error("Add Movie Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =====================================================
// ADD SHOW
// =====================================================
export const addShow = async (req, res) => {
    try {
        const {
            movie,
            price,
            dateTimes,
            theaterId,
        } = req.body;

        console.log("======================================");
        console.log("ADD SHOW REQUEST RECEIVED");
        console.log("Movie:", movie);
        console.log("Price:", price);
        console.log("Date Times:", dateTimes);
        console.log("Theater ID:", theaterId);
        console.log("======================================");

        // =====================================================
        // VALIDATE MOVIE
        // =====================================================

        if (!movie || typeof movie !== "object") {
            return res.status(400).json({
                success: false,
                message: "Movie data is required",
            });
        }

        const movieId = String(
            movie._id || movie.id || ""
        );

        if (!movieId) {
            return res.status(400).json({
                success: false,
                message: "Selected movie does not contain an ID",
            });
        }

        const movieTitle =
            movie.title ||
            movie.name ||
            "";

        if (!movieTitle) {
            return res.status(400).json({
                success: false,
                message: "Movie title is required",
            });
        }

        // =====================================================
        // VALIDATE PRICE
        // =====================================================

        const showPrice = Number(price);

        if (
            !Number.isFinite(showPrice) ||
            showPrice <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid show price",
            });
        }

        // =====================================================
        // VALIDATE DATE/TIME
        // =====================================================

        if (
            !dateTimes ||
            typeof dateTimes !== "object" ||
            Array.isArray(dateTimes) ||
            Object.keys(dateTimes).length === 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Please add at least one show date and time",
            });
        }

        // =====================================================
        // VALIDATE THEATER ID
        // =====================================================

        if (!theaterId) {
            return res.status(400).json({
                success: false,
                message: "Please select a theater",
            });
        }

        if (
            !mongoose.Types.ObjectId.isValid(theaterId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid theater ID",
            });
        }

        // =====================================================
        // FIND MOVIE
        // =====================================================

        let movieDocument =
            await Movie.findById(movieId);

        // If movie doesn't exist, create it
        if (!movieDocument) {
            console.log(
                "Movie not found. Creating movie..."
            );

            movieDocument =
                await Movie.create({
                    _id: movieId,
                    title: movieTitle,
                    overview:
                        movie.overview || "",
                    poster_path:
                        movie.poster_path ||
                        movie.poster ||
                        movie.image ||
                        "",
                    backdrop_path:
                        movie.backdrop_path ||
                        movie.backdrop ||
                        "",
                    release_date:
                        movie.release_date ||
                        movie.releaseDate ||
                        "",
                    original_language:
                        movie.original_language ||
                        "",
                    tagline:
                        movie.tagline || "",
                    genres:
                        movie.genres ||
                        movie.genre_ids ||
                        [],
                    casts:
                        movie.casts ||
                        movie.cast ||
                        [],
                    vote_average:
                        Number(
                            movie.vote_average
                        ) || 0,
                    runtime:
                        Number(
                            movie.runtime
                        ) || 0,
                });

            console.log(
                "Movie created:",
                movieDocument._id
            );
        }

        const savedMovieId =
            String(movieDocument._id);

        // =====================================================
        // FIND THEATER
        // =====================================================

        const theater =
            await Theater.findById(theaterId);

        if (!theater) {
            return res.status(404).json({
                success: false,
                message:
                    "Selected theater was not found in database",
            });
        }

        console.log(
            "Selected theater:",
            theater.name,
            theater._id
        );

        // =====================================================
        // CREATE SHOW DOCUMENTS
        // =====================================================

        const showsToCreate = [];

        for (
            const [date, times]
            of Object.entries(dateTimes)
        ) {
            if (!Array.isArray(times)) {
                continue;
            }

            for (const time of times) {

                const showDateTime =
                    new Date(
                        `${date}T${time}`
                    );

                if (
                    isNaN(
                        showDateTime.getTime()
                    )
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            `Invalid date/time: ${date} ${time}`,
                    });
                }

                // =====================================================
                // CHECK DUPLICATE FOR SAME MOVIE + SAME THEATER + TIME
                // =====================================================

                const existingShow =
                    await Show.findOne({
                        movie: savedMovieId,
                        theaterId: theaterId,
                        showDateTime:
                            showDateTime,
                    });

                if (existingShow) {
                    return res.status(400).json({
                        success: false,
                        message:
                            `${movieTitle} already has a show at ${theater.name} on ${date} at ${time}`,
                    });
                }

                // =====================================================
                // SAVE SHOW WITH THEATER
                // =====================================================

                showsToCreate.push({
                    movie: savedMovieId,

                    theaterId: theater._id,

                    theaterName:
                        theater.name,

                    theaterLat:
                        Number(
                            theater.latitude
                        ) || 0,

                    theaterLng:
                        Number(
                            theater.longitude
                        ) || 0,

                    theaterCity:
                        theater.city || "",

                    theaterAddress:
                        theater.address || "",

                    showDateTime:
                        showDateTime,

                    showPrice:
                        showPrice,

                    occupiedSeats: {},
                });
            }
        }

        // =====================================================
        // NO SHOWS
        // =====================================================

        if (
            showsToCreate.length === 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "No valid show date/time found",
            });
        }

        // =====================================================
        // INSERT SHOWS
        // =====================================================

        const createdShows =
            await Show.insertMany(
                showsToCreate
            );

        console.log(
            "======================================"
        );

        console.log(
            "SHOWS INSERTED SUCCESSFULLY"
        );

        console.log(
            createdShows
        );

        console.log(
            "======================================"
        );

        return res.status(201).json({
            success: true,
            message:
                "Movie and shows added successfully",

            movie:
                movieDocument,

            theater:
                theater,

            shows:
                createdShows,
        });

    } catch (error) {

        console.error(
            "ADD SHOW ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
// =====================================================
// GET ALL SHOWS
// =====================================================
export const getAllShows = async (req, res) => {
    try {
        const shows = await Show.find()
            .populate("movie")
            .sort({ showDateTime: 1 });
        return res.status(200).json({
            success: true,
            shows,
        });
    } catch (error) {
        console.error("Get All Shows Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =====================================================
// GET SHOWS FOR ONE MOVIE
// =====================================================
export const getShow = async (req, res) => {
    try {
        const { movieId } = req.params;
        if (!movieId) {
            return res.status(400).json({
                success: false,
                message: "Movie ID is required",
            });
        }

        console.log("======================================");
        console.log("GET SHOWS FOR MOVIE");
        console.log("Movie ID:", movieId);

        const shows = await Show.find({ movie: String(movieId) })
            .populate("movie")
            .sort({ showDateTime: 1 });

        console.log("Shows found:", shows.length);
        console.log("Shows:", shows);

        return res.status(200).json({
            success: true,
            shows,
        });
    } catch (error) {
        console.error("Get Show Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =====================================================
// DELETE SHOW BY ID
// =====================================================
export const deleteShow = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Show ID is required",
            });
        }

        const deletedShow = await Show.findByIdAndDelete(id);

        if (!deletedShow) {
            return res.status(404).json({
                success: false,
                message: "Show not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Show deleted successfully",
            deletedShow,
        });
    } catch (error) {
        console.error("Delete Show Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =====================================================
// GET MOVIES HAVING SHOWS
// =====================================================
export const getUniqueShows = async (req, res) => {
    try {
        const shows = await Show.find();
        const movieIds = [...new Set(shows.map((show) => String(show.movie)))];
        return res.status(200).json({
            success: true,
            movieIds,
        });
    } catch (error) {
        console.error("Get Unique Shows Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =====================================================
// GET NOW SHOWING MOVIES
// =====================================================
export const getNowShowingMovies = async (req, res) => {
    try {
        console.log("======================================");
        console.log("GET NOW SHOWING MOVIES");

        const shows = await Show.find()
            .sort({ showDateTime: -1 })
            .lean();

        console.log("Total shows:", shows.length);

        if (shows.length === 0) {
            return res.status(200).json({
                success: true,
                movies: [],
            });
        }

        const movieIds = [...new Set(shows.map((show) => String(show.movie)))];
        console.log("Movie IDs from Show collection:", movieIds);

        const movies = await Movie.find({ _id: { $in: movieIds } }).lean();
        console.log("Movies found in Movie collection:", movies.length);

        const movieMap = new Map();
        movies.forEach((movie) => {
            movieMap.set(String(movie._id), movie);
        });

        const orderedMovies = [];
        const alreadyAdded = new Set();

        for (const show of shows) {
            const movieId = String(show.movie);
            const movie = movieMap.get(movieId);
            if (movie && !alreadyAdded.has(movieId)) {
                alreadyAdded.add(movieId);
                orderedMovies.push(movie);
            }
        }

        console.log("Movies returned:", orderedMovies.length);
        console.log("======================================");

        return res.status(200).json({
            success: true,
            movies: orderedMovies,
        });
    } catch (error) {
        console.error("Get Now Showing Movies Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =====================================================
// GET SINGLE MOVIE BY ID (for favourites fallback)
// =====================================================
export const getMovieById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Movie ID is required.",
            });
        }

        const movie = await Movie.findById(String(id)).lean();
        if (!movie) {
            return res.status(404).json({
                success: false,
                message: "Movie not found.",
            });
        }

        return res.status(200).json({
            success: true,
            movie,
        });
    } catch (error) {
        console.error("Get movie by ID error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =====================================================
// SEARCH MOVIES (for navbar search)
// =====================================================
export const searchMovies = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query || query.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Search query is required.",
            });
        }

        const movies = await Movie.find({
            title: { $regex: query.trim(), $options: "i" }
        }).lean();

        return res.status(200).json({
            success: true,
            movies,
        });
    } catch (error) {
        console.error("Search error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =====================================================
// GET SHOWS FOR ONE THEATER
// =====================================================
export const getShowsByTheater = async (req, res) => {
    try {
        const { theaterId } = req.params;

        console.log(
            "Getting shows for theater:",
            theaterId
        );

        if (!theaterId) {
            return res.status(400).json({
                success: false,
                message: "Theater ID is required",
            });
        }

        if (
            !mongoose.Types.ObjectId.isValid(
                theaterId
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid theater ID",
            });
        }

        const shows = await Show.find({
            theaterId: theaterId,
        })
            .populate("movie")
            .populate("theaterId")
            .sort({
                showDateTime: 1,
            });

        console.log(
            "Shows found:",
            shows.length
        );

        return res.status(200).json({
            success: true,
            shows,
        });

    } catch (error) {

        console.error(
            "Get Shows By Theater Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};