import express from 'express'
import {
  getMovies,
  addMovie,
  getAllShows,
  getUniqueShows,
  getShow
} from '../controllers/showController.js'

import { protect } from '../middleWare/auth.js'

const showRouter = express.Router()

// Get all movies
showRouter.get('/all', getMovies)

// Add movie
showRouter.post('/movies', protect, addMovie)

// Get all shows
showRouter.get('/shows', getAllShows)

// Get unique movies that have shows
showRouter.get('/unique', getUniqueShows)

// Get single show
showRouter.get('/show/:id', getShow)

export default showRouter