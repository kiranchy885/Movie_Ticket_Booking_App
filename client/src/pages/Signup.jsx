import React, {
    useState,
} from "react";

import {
    Link,
    useNavigate,
} from "react-router-dom";

import { assets } from "../assets/assets";

import {
    useAuth,
} from "../context/AuthContext";


const Signup = () => {

    const [name, setName] =
        useState("");

    const [email, setEmail] =
        useState("");

    const [password, setPassword] =
        useState("");

    const [confirm, setConfirm] =
        useState("");

    const [error, setError] =
        useState("");

    const [loading, setLoading] =
        useState(false);


    const {
        signup,
    } = useAuth();


    const navigate =
        useNavigate();


    // =====================================================
    // SIGNUP
    // =====================================================

    const handleSubmit = async (e) => {

        e.preventDefault();

        setError("");


        if (
            !name.trim() ||
            !email.trim() ||
            !password ||
            !confirm
        ) {

            setError(
                "Please fill in all fields."
            );

            return;

        }


        if (
            password !== confirm
        ) {

            setError(
                "Passwords do not match."
            );

            return;

        }


        if (
            password.length < 6
        ) {

            setError(
                "Password must be at least 6 characters."
            );

            return;

        }


        setLoading(true);


        try {

            await signup(
                name.trim(),
                email.trim(),
                password
            );


            // Signup creates a normal user
            // and logs them in automatically.

            navigate(
                "/",
                {
                    replace: true,
                }
            );

        } catch (err) {

            console.error(
                "Signup error:",
                err
            );


            setError(
                err.message ||
                "Could not create account. Try again."
            );

        } finally {

            setLoading(false);

        }

    };


    return (

        <div className="min-h-screen flex items-center justify-center bg-black px-4">

            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/20 via-black to-black pointer-events-none" />


            <div className="relative z-10 w-full max-w-md">

                {/* LOGO */}

                <div className="flex justify-center mb-8">

                    <Link to="/">

                        <img
                            src={assets.logo}
                            alt="Logo"
                            className="w-36 h-auto"
                        />

                    </Link>

                </div>


                {/* CARD */}

                <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-8">

                    <h1 className="text-2xl font-bold text-white mb-1">
                        Create an account
                    </h1>


                    <p className="text-gray-400 text-sm mb-6">
                        Book tickets, save favorites, and more
                    </p>


                    {error && (

                        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">

                            {error}

                        </div>

                    )}


                    <form
                        onSubmit={handleSubmit}
                        className="space-y-5"
                    >

                        {/* NAME */}

                        <div>

                            <label
                                className="block text-sm text-gray-300 mb-1.5"
                                htmlFor="name"
                            >
                                Full name
                            </label>


                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) =>
                                    setName(
                                        e.target.value
                                    )
                                }
                                placeholder="John Doe"
                                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm"
                                required
                            />

                        </div>


                        {/* EMAIL */}

                        <div>

                            <label
                                className="block text-sm text-gray-300 mb-1.5"
                                htmlFor="email"
                            >
                                Email address
                            </label>


                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) =>
                                    setEmail(
                                        e.target.value
                                    )
                                }
                                placeholder="you@example.com"
                                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm"
                                required
                            />

                        </div>


                        {/* PASSWORD */}

                        <div>

                            <label
                                className="block text-sm text-gray-300 mb-1.5"
                                htmlFor="password"
                            >
                                Password
                            </label>


                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) =>
                                    setPassword(
                                        e.target.value
                                    )
                                }
                                placeholder="Min. 6 characters"
                                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm"
                                required
                            />

                        </div>


                        {/* CONFIRM */}

                        <div>

                            <label
                                className="block text-sm text-gray-300 mb-1.5"
                                htmlFor="confirm"
                            >
                                Confirm password
                            </label>


                            <input
                                id="confirm"
                                type="password"
                                value={confirm}
                                onChange={(e) =>
                                    setConfirm(
                                        e.target.value
                                    )
                                }
                                placeholder="••••••••"
                                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition text-sm"
                                required
                            />

                        </div>


                        {/* SIGNUP */}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 bg-primary hover:bg-primary-dull disabled:opacity-50 disabled:cursor-not-allowed transition rounded-lg font-semibold text-white text-sm"
                        >

                            {loading
                                ? "Creating account..."
                                : "Create Account"}

                        </button>

                    </form>


                    <p className="mt-6 text-center text-sm text-gray-400">

                        Already have an account?{" "}

                        <Link
                            to="/login"
                            className="text-primary hover:underline font-medium"
                        >
                            Sign in
                        </Link>

                    </p>

                </div>

            </div>

        </div>

    );

};


export default Signup;