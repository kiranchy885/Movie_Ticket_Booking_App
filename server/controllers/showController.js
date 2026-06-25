import Movie from "../models/Movie.js";

// export const getNowPlayingMovies = async (req, res) => 
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