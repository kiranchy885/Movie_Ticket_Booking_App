import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false)
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    const handleLogout = () => {
        logout()
        navigate('/')
    }

    return (
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', background: '#111', position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 999 }}>
            <Link to='/' style={{ color: 'white', fontWeight: 'bold', fontSize: '20px', textDecoration: 'none' }}>
                🎬 MovieApp
            </Link>

            <div style={{ display: 'flex', gap: '24px' }}>
                <Link to='/' style={{ color: 'white', textDecoration: 'none' }}>Home</Link>
                <Link to='/movies' style={{ color: 'white', textDecoration: 'none' }}>Movies</Link>
                <Link to='/favorite' style={{ color: 'white', textDecoration: 'none' }}>Favorites</Link>
                <Link to='/my-booking' style={{ color: 'white', textDecoration: 'none' }}>My Bookings</Link>
            </div>

            <div>
                {!user ? (
                    <button
                        onClick={() => navigate('/login')}
                        style={{ padding: '8px 20px', background: '#e50914', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        Login
                    </button>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ color: 'white', fontSize: '14px' }}>Hi, {user.name}</span>
                        <button
                            onClick={handleLogout}
                            style={{ padding: '8px 20px', background: 'transparent', color: 'white', border: '1px solid white', borderRadius: '20px', cursor: 'pointer' }}
                        >
                            Logout
                        </button>
                    </div>
                )}
            </div>
        </nav>
    )
}

export default Navbar