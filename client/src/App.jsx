import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Movies from './pages/Movies'
import MovieDetail from './pages/MovieDetail'
import SeatLayout from './pages/SeatLayout'
import MyBooking from './pages/MyBooking'
import Favorite from './pages/Favorite'
import Login from './pages/Login'
import Signup from './pages/Signup'
import { Routes, Route, useLocation } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/admin/Dashboard'
import AddShows from './pages/admin/AddShows'
import ListBookings from './pages/admin/ListBookings'
import ListShows from './pages/admin/ListShows'
import Layout from './pages/admin/Layout'

const App = () => {
  const { pathname } = useLocation()
  const isAdminRoute = pathname.startsWith('/admin')

  return (
    <>
      {!isAdminRoute && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/movies/:id" element={<MovieDetail />} />
        <Route path="/movies/:id/:date" element={<ProtectedRoute><SeatLayout /></ProtectedRoute>} />
        <Route path="/my-booking" element={<ProtectedRoute><MyBooking /></ProtectedRoute>} />
        <Route path="/favorite" element={<ProtectedRoute><Favorite /></ProtectedRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/admin/*" element={<Layout />}>
  <Route index element={<Dashboard />} />
  <Route path="add-shows" element={<AddShows />} />
  <Route path="list-shows" element={<ListShows />} />
  <Route path="list-bookings" element={<ListBookings />} />
</Route>
      </Routes>
      {!isAdminRoute && <Footer />}
    </>
  )
}

export default App