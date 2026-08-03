import { err } from "inngest/types";
import Movie from "../models/Movie.js";
import Show from "../models/Show.js";

// Get all movies 
  export const getMovies = async (req, res) => {
  try {
    const movies = await Movie.find();  // Fetch data from DataBase

    res.status(200).json({
      success: true,
      movies,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Add a new Movie
export const addMovie = async (req, res) => {
  try {
    const{
    title,
    overview,
    poster_path,
    backdrop_path,
    release_date,
    original_language,
    tagline,
    genres,
    casts,
    runtime,
    vote_average,
    trailer,
  } = req.body;

  const movie = new Movie({
    title,
    overview,
    poster_path,
    backdrop_path,
    release_date,
    original_language,
    tagline,
    genres,
    casts,
    runtime,
    vote_average,
    trailer,
  });

  await movie.save();

  res.status(201).json({
    success: true,
    message: "Movie added successfully",
    movie,
  });
} catch (error) {
  console.log(error);
  res.status(500).json({
    success: false,
    message: error.message,
  });
}
};

// Get all shows
export const getAllShows = async (req, res) => {
  try {
    const shows = await Show.find()
    .populate("movie")
    .sort({ showDateTime: 1 });

    res.status(200).json({
      success: true,
      shows,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Unique movies that have shows
export const getUniqueShows = async (req, res) => {
  try {
    const shows = await Show.find().populate("movie");

    const uniqueMovies = [];
    const movieIds = new Set();

    shows.forEach((show) => {
      if (show.movie && !movieIds.has(show.movie._id.toString())) {
        movieIds.add(show.movie._id.toString());
        uniqueMovies.push(show.movie);
      }
    });

    res.status(200).json({
      success: true,
      movies: uniqueMovies,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Single Show
export const getShow = async (req, res) => {
  try {
    const { id } = req.params;

    const show = await Show.findById(id).populate("movie");

    if (!show) {
      return res.status(404).json({
        success: false,
        message: "Show not found",
      });
    }

    res.status(200).json({
      success: true,
      show,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get upcoming shows for a movie


// import axios from "axios";
// import Movie from "../models/Movies.js";

// export const getNowPlayingMovies = async (req, res)=>{
//     try{
//         const { data } = await axios.get('',{
//             headers: {Authorization : {}}
//         })

//         const movies = data.results;
//         res.json({success: true, movies: movies})
//     } catch (error) {
//         console.error(error);
//         res.json({success: false, message: error.message})
//     }
// }

// // API to add new show to the database
// export const addShow = async (req, res) =>{
//     try {
//         const {movieId, showsInput, showPrice} = req.body

//         let movie = await Movie.findById(movieId)

//         if(!movie) {
//             // Fetch movie details and credits 
//             const [movieDetailsResponse, movieCreditsResponse] = await Promise.all([
//                 axios.get(`${movieId}`,{
//            headers: {Authorization : `Bearer ${process.env.TMDB_API_KEY}`  
//            }),
//            const movieApiData = movieDetailsResponse.data;
//            const movieCreditsData = movieCreditsResponse.data;

//            const movieDetails ={
//              _id: movieId,
//              title: movieApiData.title,
//              overview: movieApiData.poster_path,
//              backdrop_path: moviesApiData.backdrop_path,}
//             ])
//         }
//     } catch (error) {
//         console.error(error);
//         res.json({success: false, message: error.message})
//     }
// }