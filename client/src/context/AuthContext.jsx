import React, { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const stored = localStorage.getItem('auth_user')
            return stored ? JSON.parse(stored) : null
        } catch {
            return null
        }
    })

    const login = async (email, password) => {
        const loggedInUser = { name: 'Demo User', email, avatar: null }
        setUser(loggedInUser)
        localStorage.setItem('auth_user', JSON.stringify(loggedInUser))
    }

    const signup = async (name, email, password) => {
        const newUser = { name, email, avatar: null }
        setUser(newUser)
        localStorage.setItem('auth_user', JSON.stringify(newUser))
    }

    const logout = () => {
        setUser(null)
        localStorage.removeItem('auth_user')
    }

    return (
        <AuthContext.Provider value={{ user, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
    return ctx
}