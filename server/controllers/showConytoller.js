import axios from "axios";


export const getNowPlayingMovies = async (req, res)=>{
    try{
        const { data } = await axios.get('',{
            headers: {Authorization : {}}
        })

        const movies = data.results;
        res.json({success: true, movies: movies})
    } catch (error) {
        console.error(error);
        res.json({success: false, message: error.message})
    }
}