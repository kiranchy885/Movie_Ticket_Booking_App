import React, {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";

import { useNavigate } from "react-router-dom";

// =====================================================
// CREATE CONTEXT
// =====================================================

const AuthContext = createContext();

// =====================================================
// API URL
// =====================================================

const API_URL = "http://localhost:5000";

// =====================================================
// AUTH PROVIDER
// =====================================================

export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();

    // =================================================
    // USER
    // =================================================

    const [user, setUser] = useState(null);

    // =================================================
    // ADMIN
    // =================================================

    const [admin, setAdmin] = useState(null);

    // =================================================
    // LOADING
    // =================================================

    const [loading, setLoading] = useState(true);

    // =================================================
    // LOAD SAVED LOGIN SESSION
    // =================================================

    useEffect(() => {
        try {
            const savedUser =
                localStorage.getItem("userUser");

            const savedAdmin =
                localStorage.getItem("adminUser");

            const token =
                localStorage.getItem("token");

            // =============================================
            // RESTORE ADMIN
            // =============================================

            if (savedAdmin && token) {
                const adminData =
                    JSON.parse(savedAdmin);

                if (
                    adminData &&
                    adminData.role === "admin"
                ) {
                    setAdmin(adminData);
                    setUser(null);
                } else {
                    localStorage.removeItem("adminUser");
                    localStorage.removeItem("token");
                }
            }

            // =============================================
            // RESTORE NORMAL USER
            // =============================================

            else if (savedUser && token) {
                const userData =
                    JSON.parse(savedUser);

                if (
                    userData &&
                    userData.role === "user"
                ) {
                    setUser(userData);
                    setAdmin(null);
                } else {
                    localStorage.removeItem("userUser");
                    localStorage.removeItem("token");
                }
            }

            // =============================================
            // NO SESSION
            // =============================================

            else {
                setUser(null);
                setAdmin(null);
            }
        } catch (error) {
            console.error(
                "Error restoring login session:",
                error
            );

            localStorage.removeItem("userUser");
            localStorage.removeItem("adminUser");
            localStorage.removeItem("token");

            setUser(null);
            setAdmin(null);
        } finally {
            setLoading(false);
        }
    }, []);

    // =====================================================
    // LOGIN
    // =====================================================

    const login = async (email, password) => {
        try {
            // IMPORTANT:
            // Backend route should be:
            // POST /api/user/login

            const response = await fetch(
                `${API_URL}/api/user/login`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        email: email
                            .trim()
                            .toLowerCase(),

                        password,
                    }),
                }
            );

            // =============================================
            // SAFELY READ RESPONSE
            // =============================================

            const contentType =
                response.headers.get("content-type");

            let data;

            if (
                contentType &&
                contentType.includes("application/json")
            ) {
                data = await response.json();
            } else {
                const text = await response.text();

                console.error(
                    "Server returned non-JSON response:",
                    text
                );

                throw new Error(
                    `Server error: ${response.status}`
                );
            }

            console.log(
                "Login response:",
                data
            );

            // =============================================
            // LOGIN FAILED
            // =============================================

            if (
                !response.ok ||
                !data.success
            ) {
                throw new Error(
                    data.message ||
                    "Invalid email or password."
                );
            }

            // =============================================
            // GET USER + TOKEN
            // =============================================

            const loggedInUser =
                data.user;

            const token =
                data.token;

            // =============================================
            // CHECK SERVER RESPONSE
            // =============================================

            if (
                !loggedInUser ||
                !token
            ) {
                throw new Error(
                    "Invalid login response from server."
                );
            }

            // =============================================
            // ADMIN LOGIN
            // =============================================

            if (
                loggedInUser.role === "admin"
            ) {
                // Remove normal user session
                localStorage.removeItem(
                    "userUser"
                );

                // Save token
                localStorage.setItem(
                    "token",
                    token
                );

                // Save admin
                localStorage.setItem(
                    "adminUser",
                    JSON.stringify(
                        loggedInUser
                    )
                );

                // Update state
                setUser(null);
                setAdmin(loggedInUser);

                console.log(
                    "Admin login successful"
                );

                console.log(
                    "Admin:",
                    loggedInUser
                );

                console.log(
                    "Admin token saved:",
                    localStorage.getItem("token")
                );

                return {
                    ...loggedInUser,
                    token,
                };
            }

            // =============================================
            // NORMAL USER LOGIN
            // =============================================

            if (
                loggedInUser.role === "user"
            ) {
                // Remove admin session
                localStorage.removeItem(
                    "adminUser"
                );

                // Save token
                localStorage.setItem(
                    "token",
                    token
                );

                // Save user
                localStorage.setItem(
                    "userUser",
                    JSON.stringify(
                        loggedInUser
                    )
                );

                // Update state
                setAdmin(null);
                setUser(loggedInUser);

                console.log(
                    "User login successful"
                );

                console.log(
                    "User:",
                    loggedInUser
                );

                console.log(
                    "User token saved:",
                    localStorage.getItem("token")
                );

                return {
                    ...loggedInUser,
                    token,
                };
            }

            // =============================================
            // INVALID ROLE
            // =============================================

            throw new Error(
                "Invalid account role."
            );
        } catch (error) {
            console.error(
                "Login error:",
                error
            );

            throw error;
        }
    };

    // =====================================================
    // SIGNUP
    // =====================================================

    const signup = async (
        name,
        email,
        password
    ) => {
        try {
            // IMPORTANT:
            // Backend route should be:
            // POST /api/user/signup

            const response = await fetch(
                `${API_URL}/api/user/signup`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        name: name.trim(),

                        email: email
                            .trim()
                            .toLowerCase(),

                        password,
                    }),
                }
            );

            // =============================================
            // SAFELY READ RESPONSE
            // =============================================

            const contentType =
                response.headers.get("content-type");

            let data;

            if (
                contentType &&
                contentType.includes("application/json")
            ) {
                data = await response.json();
            } else {
                const text = await response.text();

                console.error(
                    "Server returned non-JSON response:",
                    text
                );

                throw new Error(
                    `Server error: ${response.status}`
                );
            }

            console.log(
                "Signup response:",
                data
            );

            // =============================================
            // SIGNUP FAILED
            // =============================================

            if (
                !response.ok ||
                !data.success
            ) {
                throw new Error(
                    data.message ||
                    "Could not create account."
                );
            }

            // =============================================
            // GET USER + TOKEN
            // =============================================

            const newUser =
                data.user;

            const token =
                data.token;

            // =============================================
            // CHECK SERVER RESPONSE
            // =============================================

            if (
                !newUser ||
                !token
            ) {
                throw new Error(
                    "Invalid signup response from server."
                );
            }

            // =============================================
            // SIGNUP ALWAYS CREATES NORMAL USER
            // =============================================

            // Remove admin session
            localStorage.removeItem(
                "adminUser"
            );

            // Save token
            localStorage.setItem(
                "token",
                token
            );

            // Save user
            localStorage.setItem(
                "userUser",
                JSON.stringify(
                    newUser
                )
            );

            // Update state
            setAdmin(null);
            setUser(newUser);

            console.log(
                "Signup successful"
            );

            console.log(
                "New user:",
                newUser
            );

            console.log(
                "Signup token saved:",
                localStorage.getItem("token")
            );

            return {
                ...newUser,
                token,
            };
        } catch (error) {
            console.error(
                "Signup error:",
                error
            );

            throw error;
        }
    };

    // =====================================================
    // CHECK LOGIN
    // =====================================================

    const isLoggedIn = () => {
        return !!(
            user ||
            admin
        );
    };

    // =====================================================
    // REQUIRE LOGIN
    // =====================================================

    const requireLogin = (action) => {
        if (!isLoggedIn()) {
            navigate("/login");
            return false;
        }

        if (
            typeof action === "function"
        ) {
            action();
        }

        return true;
    };

    // =====================================================
    // USER LOGOUT
    // =====================================================

    const logoutUser = () => {
        localStorage.removeItem(
            "token"
        );

        localStorage.removeItem(
            "userUser"
        );

        setUser(null);

        navigate("/login");
    };

    // =====================================================
    // ADMIN LOGOUT
    // =====================================================

    const logoutAdmin = () => {
        localStorage.removeItem(
            "token"
        );

        localStorage.removeItem(
            "adminUser"
        );

        setAdmin(null);

        navigate("/login");
    };

    // =====================================================
    // GENERAL LOGOUT
    // =====================================================

    const logout = () => {
        localStorage.removeItem(
            "token"
        );

        localStorage.removeItem(
            "userUser"
        );

        localStorage.removeItem(
            "adminUser"
        );

        setUser(null);
        setAdmin(null);

        navigate("/login");
    };

    // =====================================================
    // CONTEXT VALUE
    // =====================================================

    const value = {
        user,

        admin,

        loading,

        login,

        signup,

        logout,

        logoutUser,

        logoutAdmin,

        // =============================================
        // LOGIN STATUS
        // =============================================

        isUserLoggedIn: !!user,

        isAdminLoggedIn: !!admin,

        isLoggedIn,

        // =============================================
        // PROTECTED ACTION
        // =============================================

        requireLogin,
    };

    // =====================================================
    // PROVIDER
    // =====================================================

    return (
        <AuthContext.Provider
            value={value}
        >
            {children}
        </AuthContext.Provider>
    );
};

// =========================================================
// USE AUTH
// =========================================================

export const useAuth = () => {
    const context =
        useContext(AuthContext);

    if (!context) {
        throw new Error(
            "useAuth must be used inside AuthProvider"
        );
    }

    return context;
};

export default AuthContext;