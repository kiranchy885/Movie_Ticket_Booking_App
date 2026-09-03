import Movie from "../models/Movie.js";

// =====================================================
// ADD MOVIE
// =====================================================

export const addMovie = async (req, res) => {
  try {
    const movieData = req.body;

    console.log("Movie data received:", movieData);

    // Validate required fields
    if (!movieData._id || !movieData.title) {
      return res.status(400).json({
        success: false,
        message: "Movie ID and title are required.",
      });
    }

    // Check if movie already exists
    const existingMovie = await Movie.findById(
      String(movieData._id)
    );

    if (existingMovie) {
      return res.status(400).json({
        success: false,
        message: "Movie already exists.",
      });
    }

    // Create movie
    const movie = await Movie.create({
      ...movieData,
      _id: String(movieData._id),
    });

    console.log("Movie saved:", movie);

    return res.status(201).json({
      success: true,
      message: "Movie added successfully.",
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
// GET ALL MOVIES + SEARCH
// GET: /api/movie/all
// GET: /api/movie/all?search=avengers
// =====================================================

export const getMovies = async (req, res) => {
  try {
    const { search = "" } = req.query;

    let query = {};

    // Search by movie title
    if (search.trim()) {
      query = {
        title: {
          $regex: search.trim(),
          $options: "i",
        },
      };
    }

    const movies = await Movie.find(query).sort({
      createdAt: -1,
    });

    console.log(
      `Movies found: ${movies.length}`,
      search
        ? `for search: ${search}`
        : ""
    );

    return res.status(200).json({
      success: true,
      movies,
      totalMovies: movies.length,
    });
  } catch (error) {
    console.error("Get Movies Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};