import Movie from "../models/Movie.js";
import Show from "../models/Show.js";

/* =========================================================
   GET ALL MOVIES
========================================================= */
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
            message: "Failed to fetch movies",
            error: error.message,
        });
    }
};


/* =========================================================
   SEARCH MOVIES
========================================================= */
export const searchMovies = async (req, res) => {
    try {
        const { query } = req.query;

        console.log("Search query received:", query);

        if (!query || !query.trim()) {
            return res.status(200).json({
                success: true,
                movies: [],
            });
        }

        const movies = await Movie.find({
            title: {
                $regex: query.trim(),
                $options: "i",
            },
        })
            .limit(10)
            .lean();

        console.log("Movies found:", movies.length);
        console.log("Movies:", movies);

        return res.status(200).json({
            success: true,
            movies,
        });
    } catch (error) {
        console.error("Search Movies Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to search movies",
            error: error.message,
        });
    }
};


/* =========================================================
   ADD MOVIE
========================================================= */
export const addMovie = async (req, res) => {
    try {
        const movieData = req.body;

        if (!movieData._id) {
            return res.status(400).json({
                success: false,
                message: "Movie ID is required",
            });
        }

        if (!movieData.title) {
            return res.status(400).json({
                success: false,
                message: "Movie title is required",
            });
        }

        const existingMovie = await Movie.findById(movieData._id);

        if (existingMovie) {
            return res.status(409).json({
                success: false,
                message: "Movie already exists",
            });
        }

        const movie = await Movie.create(movieData);

        return res.status(201).json({
            success: true,
            message: "Movie added successfully",
            movie,
        });
    } catch (error) {
        console.error("Add Movie Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to add movie",
            error: error.message,
        });
    }
};


/* =========================================================
   ADD SHOW
========================================================= */
export const addShow = async (req, res) => {
    try {
        const {
            movie,
            showDateTime,
            showPrice,
        } = req.body;

        if (!movie) {
            return res.status(400).json({
                success: false,
                message: "Movie ID is required",
            });
        }

        if (!showDateTime) {
            return res.status(400).json({
                success: false,
                message: "Show date and time are required",
            });
        }

        if (showPrice === undefined || showPrice === null) {
            return res.status(400).json({
                success: false,
                message: "Show price is required",
            });
        }

        const movieExists = await Movie.findById(movie);

        if (!movieExists) {
            return res.status(404).json({
                success: false,
                message: "Movie not found",
            });
        }

        const show = await Show.create({
            movie,
            showDateTime: new Date(showDateTime),
            showPrice: Number(showPrice),
            occupiedSeats: {},
        });

        return res.status(201).json({
            success: true,
            message: "Show added successfully",
            show,
        });
    } catch (error) {
        console.error("Add Show Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to add show",
            error: error.message,
        });
    }
};


/* =========================================================
   GET ALL SHOWS
========================================================= */
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
            message: "Failed to fetch shows",
            error: error.message,
        });
    }
};


/* =========================================================
   GET SHOWS FOR ONE MOVIE
========================================================= */
export const getShow = async (req, res) => {
    try {
        const { movieId } = req.params;

        if (!movieId) {
            return res.status(400).json({
                success: false,
                message: "Movie ID is required",
            });
        }

        const shows = await Show.find({
            movie: movieId,
        }).sort({
            showDateTime: 1,
        });

        return res.status(200).json({
            success: true,
            shows,
        });
    } catch (error) {
        console.error("Get Show Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch movie shows",
            error: error.message,
        });
    }
};


/* =========================================================
   GET UNIQUE SHOWS
========================================================= */
export const getUniqueShows = async (req, res) => {
    try {
        const shows = await Show.find()
            .populate("movie")
            .sort({ showDateTime: 1 });

        const uniqueMovies = [];

        const movieIds = new Set();

        for (const show of shows) {
            if (
                show.movie &&
                !movieIds.has(String(show.movie._id))
            ) {
                movieIds.add(String(show.movie._id));
                uniqueMovies.push(show);
            }
        }

        return res.status(200).json({
            success: true,
            shows: uniqueMovies,
        });
    } catch (error) {
        console.error("Get Unique Shows Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch unique shows",
            error: error.message,
        });
    }
};


/* =========================================================
   GET NOW SHOWING MOVIES
========================================================= */
export const getNowShowingMovies = async (req, res) => {
    try {
        const now = new Date();

        const shows = await Show.find({
            showDateTime: {
                $gte: now,
            },
        })
            .populate("movie")
            .sort({ showDateTime: 1 });

        const movies = [];

        const movieIds = new Set();

        for (const show of shows) {
            if (
                show.movie &&
                !movieIds.has(String(show.movie._id))
            ) {
                movieIds.add(String(show.movie._id));
                movies.push(show.movie);
            }
        }

        return res.status(200).json({
            success: true,
            movies,
        });
    } catch (error) {
        console.error("Now Showing Movies Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch now showing movies",
            error: error.message,
        });
    }
};