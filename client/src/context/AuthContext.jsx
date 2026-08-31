import React, { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)


// ========================================
// ADMIN EMAIL
// ========================================

const ADMIN_EMAIL = 'admin@gmail.com'


export const AuthProvider = ({ children }) => {

    const [user, setUser] = useState(() => {

        try {

            const stored = localStorage.getItem('auth_user')

            return stored
                ? JSON.parse(stored)
                : null

        } catch {

            return null

        }

    })


    // ========================================
    // LOGIN
    // ========================================

    const login = async (email, password) => {

        // Check if this is the admin email
        const isAdmin =
            email.toLowerCase() === ADMIN_EMAIL.toLowerCase()


        const loggedInUser = {

            name: isAdmin
                ? 'Admin'
                : 'Demo User',

            email: email,

            avatar: null,

            role: isAdmin
                ? 'admin'
                : 'user'

        }


        setUser(loggedInUser)


        localStorage.setItem(
            'auth_user',
            JSON.stringify(loggedInUser)
        )


        return loggedInUser

    }


    // ========================================
    // SIGNUP
    // ========================================

    const signup = async (name, email, password) => {

        const newUser = {

            name,

            email,

            avatar: null,

            role: 'user'

        }


        setUser(newUser)


        localStorage.setItem(
            'auth_user',
            JSON.stringify(newUser)
        )


        return newUser

    }


    // ========================================
    // LOGOUT
    // ========================================

    const logout = () => {

        setUser(null)

        localStorage.removeItem('auth_user')

    }


    return (

        <AuthContext.Provider
            value={{
                user,
                login,
                signup,
                logout
            }}
        >

            {children}

        </AuthContext.Provider>

    )

}


export const useAuth = () => {

    const ctx = useContext(AuthContext)


    if (!ctx) {

        throw new Error(
            'useAuth must be used inside AuthProvider'
        )

    }


    return ctx

}