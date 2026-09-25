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
// ADD OR UPDATE MOVIE (UPSERT)
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

        const trailerValue = movieData.trailer || movieData.trailerUrl || movieData.trailer_url || movieData.videoUrl || "";
        const posterValue = movieData.poster_path || movieData.poster || movieData.image || "";
        const backdropValue = movieData.backdrop_path || movieData.backdrop || "";
        const releaseDateValue = movieData.release_date || movieData.releaseDate || "";
        const genresValue = movieData.genres || movieData.genre_ids || [];
        const castsValue = movieData.casts || movieData.cast || [];

        const movie = await Movie.findByIdAndUpdate(
            movieId,
            {
                $set: {
                    title: title,
                    trailer: trailerValue,
                    overview: movieData.overview || "",
                    poster_path: posterValue,
                    backdrop_path: backdropValue,
                    release_date: releaseDateValue,
                    original_language: movieData.original_language || "",
                    tagline: movieData.tagline || "",
                    genres: genresValue,
                    casts: castsValue,
                    vote_average: Number(movieData.vote_average) || 0,
                    runtime: Number(movieData.runtime) || 0,
                },
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        return res.status(200).json({
            success: true,
            message: "Movie saved successfully",
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
// DELETE MOVIE (Removes movie and cleans up all theaters)
// =====================================================
export const deleteMovie = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Movie ID is required",
            });
        }

        // 1. Delete the movie document
        const deletedMovie = await Movie.findByIdAndDelete(id);
        if (!deletedMovie) {
            return res.status(404).json({
                success: false,
                message: "Movie not found",
            });
        }

        // 2. Delete all active shows associated with this movie
        await Show.deleteMany({ movie: id });

        // 3. Automatically remove this movie ID from the 'movies' array of all theaters
        await Theater.updateMany(
            { movies: id },
            { $pull: { movies: id } }
        );

        return res.status(200).json({
            success: true,
            message: "Movie and its associated shows deleted successfully, and removed from theaters.",
            deletedMovie,
        });
    } catch (error) {
        console.error("Delete Movie Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =====================================================
// ADD SHOW (Prevents past shows & cleans DB)
// =====================================================
export const addShow = async (req, res) => {
    try {
        await Show.deleteMany({ showDateTime: { $lt: new Date() } });

        const { 
            movie, 
            price, 
            dateTimes, 
            theaterId, 
            theaterName, 
            theaterLat, 
            theaterLng,
            theaterCity,
            theaterAddress 
        } = req.body;

        if (!movie || typeof movie !== "object") {
            return res.status(400).json({
                success: false,
                message: "Movie data is required",
            });
        }

        const movieId = String(movie._id || movie.id || "");
        if (!movieId) {
            return res.status(400).json({
                success: false,
                message: "Selected movie does not contain an ID",
            });
        }

        const showPrice = Number(price);
        if (!Number.isFinite(showPrice) || showPrice <= 0) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid show price",
            });
        }

        if (!dateTimes || typeof dateTimes !== "object" || Array.isArray(dateTimes) || Object.keys(dateTimes).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please add at least one show date and time",
            });
        }

        const movieDocument = await Movie.findById(movieId);
        if (!movieDocument) {
            return res.status(400).json({
                success: false,
                message: "Movie not found. Please add the movie first.",
            });
        }

        const savedMovieId = String(movieDocument._id);

        if (!theaterId) {
            return res.status(400).json({
                success: false,
                message: "Theater is required. Please select a theater first.",
            });
        }

        let theaterDoc = await Theater.findById(theaterId);
        if (!theaterDoc) {
            try {
                theaterDoc = await Theater.create({
                    _id: theaterId,
                    name: theaterName || "Unknown Theater",
                    city: theaterCity || "",
                    address: theaterAddress || "",
                    latitude: theaterLat || 0,
                    longitude: theaterLng || 0,
                    location: {
                        type: "Point",
                        coordinates: [theaterLng || 0, theaterLat || 0],
                    },
                    isActive: true,
                });
            } catch (createError) {
                console.error("Failed to create theater:", createError);
            }
        }

        const showsToCreate = [];
        const currentTime = new Date();

        for (const [date, times] of Object.entries(dateTimes)) {
            if (!Array.isArray(times)) continue;
            for (const time of times) {
                const showDateTime = new Date(`${date}T${time}`);
                if (isNaN(showDateTime.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid date/time: ${date} ${time}`,
                    });
                }

                if (showDateTime < currentTime) {
                    return res.status(400).json({
                        success: false,
                        message: `Cannot schedule a show in the past: ${date} at ${time}`,
                    });
                }

                const existingShow = await Show.findOne({
                    movie: savedMovieId,
                    showDateTime: showDateTime,
                    theaterId: theaterId,
                });

                if (existingShow) {
                    return res.status(400).json({
                        success: false,
                        message: `This show already exists at ${theaterName || "this theater"} for ${date} at ${time}.`,
                    });
                }

                showsToCreate.push({
                    movie: savedMovieId,
                    showDateTime: showDateTime,
                    showPrice: showPrice,
                    occupiedSeats: {},
                    theaterId: theaterId || "",
                    theaterName: theaterName || "",
                    theaterLat: theaterLat || 0,
                    theaterLng: theaterLng || 0,
                    theaterCity: theaterCity || "",
                    theaterAddress: theaterAddress || "",
                });
            }
        }

        if (showsToCreate.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid future show date/time found",
            });
        }

        const createdShows = await Show.insertMany(showsToCreate);

        if (theaterDoc) {
            await Theater.findByIdAndUpdate(
                theaterDoc._id,
                { $addToSet: { movies: savedMovieId } },
                { new: true }
            );
        }

        return res.status(201).json({
            success: true,
            message: "Shows added successfully",
            movie: movieDocument,
            shows: createdShows,
        });
    } catch (error) {
        console.error("ADD SHOW ERROR:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =====================================================
// GET ALL SHOWS (Filters out past shows & updates DB)
// =====================================================
export const getAllShows = async (req, res) => {
    try {
        await Show.deleteMany({ showDateTime: { $lt: new Date() } });

        const shows = await Show.find({ showDateTime: { $gte: new Date() } })
            .populate("movie")
            .populate("theaterId")
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

        await Show.deleteMany({ showDateTime: { $lt: new Date() } });

        const shows = await Show.find({ 
            movie: String(movieId),
            showDateTime: { $gte: new Date() }
        })
            .populate("movie")
            .sort({ showDateTime: 1 });

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
// DELETE SHOW BY ID (Automatically cleans up theater movies if none left)
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

        // Check if there are any remaining future shows for this movie in this theater
        const remainingShows = await Show.countDocuments({
            theaterId: deletedShow.theaterId,
            movie: deletedShow.movie,
            showDateTime: { $gte: new Date() }
        });

        // If no more shows exist for this movie in that theater, remove it from the theater's movies array
        if (remainingShows === 0) {
            await Theater.findByIdAndUpdate(deletedShow.theaterId, {
                $pull: { movies: deletedShow.movie }
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
        await Show.deleteMany({ showDateTime: { $lt: new Date() } });

        const shows = await Show.find({ showDateTime: { $gte: new Date() } });
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
        await Show.deleteMany({ showDateTime: { $lt: new Date() } });

        const shows = await Show.find({ showDateTime: { $gte: new Date() } })
            .sort({ showDateTime: -1 })
            .lean();

        if (shows.length === 0) {
            return res.status(200).json({
                success: true,
                movies: [],
            });
        }

        const movieIds = [...new Set(shows.map((show) => String(show.movie)))];
        const movies = await Movie.find({ _id: { $in: movieIds } }).lean();

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
// RATE A MOVIE
// =====================================================
export const rateMovie = async (req, res) => {
    try {
        const userId = req.userId || req.user?._id;
        const { id } = req.params;
        const { rating } = req.body;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please login to rate this movie.",
            });
        }

        const numericRating = Number(rating);
        if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
            return res.status(400).json({
                success: false,
                message: "Rating must be between 1 and 5.",
            });
        }

        const movie = await Movie.findById(String(id));
        if (!movie) {
            return res.status(404).json({
                success: false,
                message: "Movie not found.",
            });
        }

        if (!Array.isArray(movie.ratings)) {
            movie.ratings = [];
        }

        const index = movie.ratings.findIndex((r) => String(r.userId) === String(userId));

        if (index >= 0) {
            movie.ratings[index].rating = numericRating;
        } else {
            movie.ratings.push({
                userId,
                rating: numericRating,
            });
        }

        const total = movie.ratings.length;
        const sum = movie.ratings.reduce((s, r) => s + Number(r.rating || 0), 0);
        const avg = total > 0 ? sum / total : 0;

        movie.userRatingAvg = Number(avg.toFixed(1));
        movie.userRatingCount = total;

        await movie.save();

        return res.json({
            success: true,
            message: "Rating saved.",
            averageRating: movie.userRatingAvg,
            totalRatings: movie.userRatingCount,
            userRating: numericRating,
        });
    } catch (error) {
        console.error("Rate Movie Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =====================================================
// GET MOVIE RATINGS
// =====================================================
export const getMovieRatings = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId || req.user?._id || null;

        const movie = await Movie.findById(String(id)).lean();
        if (!movie) {
            return res.status(404).json({
                success: false,
                message: "Movie not found.",
            });
        }

        const ratings = Array.isArray(movie.ratings) ? movie.ratings : [];
        const total = ratings.length;
        const sum = ratings.reduce((s, r) => s + Number(r.rating || 0), 0);
        const avg = total > 0 ? sum / total : Number(movie.vote_average) || 0;

        let userRating = 0;
        if (userId) {
            const mine = ratings.find((r) => String(r.userId) === String(userId));
            if (mine) userRating = Number(mine.rating) || 0;
        }

        return res.json({
            success: true,
            averageRating: Number(avg.toFixed(1)),
            totalRatings: total,
            userRating,
        });
    } catch (error) {
        console.error("Get Movie Ratings Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};