
import { createContext, useContext, useState } from "react";
import axios from "axios";

const AppContext = createContext();

const API_URL = "http://localhost:5000";

export const AppProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(false);

    // =========================
    // Login
    // =========================
    const login = async (email, password) => {
        try {
            setLoading(true);

            const { data } = await axios.post(
                `${API_URL}/user/login`,
                {
                    email,
                    password,
                },
                {
                    withCredentials: true,
                }
            );

            if (data.success) {
                setUser(data.user);

                if (data.user?.isAdmin) {
                    setIsAdmin(true);
                }

                return {
                    success: true,
                    data,
                };
            }

            return {
                success: false,
                message: data.message || "Login failed",
            };
        } catch (error) {
            console.error("Login Error:", error);

            return {
                success: false,
                message:
                    error.response?.data?.message ||
                    error.message ||
                    "Network Error",
            };
        } finally {
            setLoading(false);
        }
    };

    // =========================
    // Register
    // =========================
    const register = async (name, email, password) => {
        try {
            setLoading(true);

            const { data } = await axios.post(
                `${API_URL}/user/register`,
                {
                    name,
                    email,
                    password,
                },
                {
                    withCredentials: true,
                }
            );

            if (data.success) {
                setUser(data.user);

                if (data.user?.isAdmin) {
                    setIsAdmin(true);
                }

                return {
                    success: true,
                    data,
                };
            }

            return {
                success: false,
                message: data.message || "Registration failed",
            };
        } catch (error) {
            console.error("Register Error:", error);

            return {
                success: false,
                message:
                    error.response?.data?.message ||
                    error.message ||
                    "Network Error",
            };
        } finally {
            setLoading(false);
        }
    };

    // =========================
    // Logout
    // =========================
    const logout = () => {
        setUser(null);
        setIsAdmin(false);
    };

    return (
        <AppContext.Provider
            value={{
                user,
                setUser,
                isAdmin,
                setIsAdmin,
                loading,
                login,
                register,
                logout,
            }}
        >
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    return useContext(AppContext);
};
