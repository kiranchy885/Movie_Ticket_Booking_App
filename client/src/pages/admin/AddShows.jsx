import React, { useEffect, useState, useCallback } from "react";
import Title from "../../components/admin/Title";
import Loading from "../../components/Loading";
import { dummyTheaters } from "../../assets/assets";
import { StarIcon, CheckIcon, Trash2 } from "lucide-react";
import { kConverter } from "../../lib/kConverter";
import { useRefresh } from "../../context/RefreshContext";

const AddShows = () => {

    const currency = import.meta.env.VITE_CURRENCY || "Rs.";

    // -------- theater states --------
    const [theaters, setTheaters] = useState([]);
    const [selectedTheater, setSelectedTheater] = useState("");
    const [loadingTheaters, setLoadingTheaters] = useState(true);

    // -------- existing states --------
    const [nowPlayingMovies, setNowPlayingMovies] = useState([]);
    const [selectedMovie, setSelectedMovie] = useState(null);
    const [showPrice, setShowPrice] = useState("");
    const [dateTimeInput, setDateTimeInput] = useState("");
    const [dateTimeSelection, setDateTimeSelection] = useState({});
    const [loading, setLoading] = useState(true);
    const [addingShow, setAddingShow] = useState(false);

    // -------- refresh hook --------
    const { refresh } = useRefresh();

    // Helper to restrict calendar to present/future dates
    const getMinDateTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    };

    // LOAD THEATERS
    const fetchTheaters = useCallback(async () => {
        try {
            setLoadingTheaters(true);
            const token = localStorage.getItem("userToken") || localStorage.getItem("token");
            const response = await fetch("http://localhost:5000/theater/all", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await response.json();
            const realTheaters = data.theaters || [];
            setTheaters(realTheaters.length > 0 ? realTheaters : dummyTheaters);
        } catch (error) {
            console.error("Error fetching theaters:", error);
            setTheaters(dummyTheaters);
        } finally {
            setLoadingTheaters(false);
        }
    }, []);

    // LOAD MOVIES (FROM DATABASE)
    const fetchMovies = useCallback(async () => {
        try {
            const token = localStorage.getItem("userToken") || localStorage.getItem("token");
            const response = await fetch("http://localhost:5000/movie/all", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success && Array.isArray(data.movies)) {
                setNowPlayingMovies(data.movies);
            } else {
                setNowPlayingMovies([]);
            }
        } catch (error) {
            console.error("Error fetching movies from database:", error);
            setNowPlayingMovies([]);
        }
    }, []);

    // INITIAL LOAD
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchMovies(), fetchTheaters()]);
            setLoading(false);
        };
        loadData();
    }, [fetchMovies, fetchTheaters]);

    // ADD DATE AND TIME
    const handleDateTimeAdd = () => {
        if (!dateTimeInput) return;
        const [date, time] = dateTimeInput.split("T");
        if (!date || !time) return;
        setDateTimeSelection((prev) => {
            const existingTimes = prev[date] || [];
            if (existingTimes.includes(time)) return prev;
            return {
                ...prev,
                [date]: [...existingTimes, time]
            };
        });
        setDateTimeInput("");
    };

    // REMOVE DATE/TIME
    const handleRemoveTime = (date, time) => {
        setDateTimeSelection((prev) => {
            const filteredTimes = (prev[date] || []).filter((item) => item !== time);
            if (filteredTimes.length === 0) {
                const { [date]: removed, ...rest } = prev;
                return rest;
            }
            return {
                ...prev,
                [date]: filteredTimes
            };
        });
    };

    // ADD SHOW
    const handleAddShow = async () => {
        if (!selectedTheater) {
            alert("Please select a theater.");
            return;
        }
        if (!selectedMovie) {
            alert("Please select a movie.");
            return;
        }
        if (!showPrice) {
            alert("Please enter show price.");
            return;
        }
        if (Object.keys(dateTimeSelection).length === 0) {
            alert("Please add at least one show date and time.");
            return;
        }

        try {
            setAddingShow(true);
            const theater = theaters.find((t) => t._id === selectedTheater || t.id === selectedTheater);
            const theaterName = theater ? theater.name : "Unknown Theater";
            const theaterLat = theater ? theater.latitude : 0;
            const theaterLng = theater ? theater.longitude : 0;
            const theaterCity = theater ? theater.city : "";
            const theaterAddress = theater ? theater.address : "";

            const showData = {
                movie: selectedMovie,
                price: Number(showPrice),
                dateTimes: dateTimeSelection,
                theaterId: selectedTheater,
                theaterName: theaterName,
                theaterLat: theaterLat,
                theaterLng: theaterLng,
                theaterCity: theaterCity,
                theaterAddress: theaterAddress
            };

            const token = localStorage.getItem("userToken") || localStorage.getItem("token");
            const response = await fetch("http://localhost:5000/show/add", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(showData)
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to add show");
            }

            alert("Show added successfully!");
            refresh();

            // CLEAR FORM
            setSelectedTheater("");
            setSelectedMovie(null);
            setShowPrice("");
            setDateTimeInput("");
            setDateTimeSelection({});
            fetchMovies();

        } catch (error) {
            console.error("Error adding show:", error);
            alert(error.message || "Failed to add show.");
        } finally {
            setAddingShow(false);
        }
    };

    if (loading) {
        return <Loading />;
    }

    return (
        <>
            <Title text1="Add" text2="Shows" />

            {/* MOVIES SECTION */}
            <div className="mt-10">
                <p className="text-lg font-medium">Now Playing Movies</p>
                {nowPlayingMovies.length === 0 ? (
                    <div className="mt-4 p-6 border border-yellow-500/30 bg-yellow-500/10 rounded-lg text-yellow-300 text-sm">
                        No movies found in the database. Please add a movie first from the <strong>Add Movie</strong> page.
                    </div>
                ) : (
                    <div className="mt-4 overflow-x-auto pb-5 scrollbar-thin">
                        <div className="flex gap-5 w-max">
                            {nowPlayingMovies.map((movie) => {
                                const movieId = movie._id || movie.id;
                                const isSelected = selectedMovie && (selectedMovie._id === movieId || selectedMovie.id === movieId);
                                return (
                                    <div
                                        key={movieId}
                                        onClick={() => setSelectedMovie(movie)}
                                        className="w-40 flex-shrink-0 cursor-pointer group"
                                    >
                                        <div className={`relative w-40 h-60 overflow-hidden rounded-lg shadow-md border-2 transition-all ${isSelected ? "border-primary" : "border-transparent"}`}>
                                            <img
                                                src={movie.poster_path || movie.poster || movie.image}
                                                alt={movie.title || movie.name}
                                                className="w-full h-full object-cover brightness-90 group-hover:brightness-100 group-hover:scale-105 transition duration-300"
                                            />
                                            <div className="absolute bottom-0 left-2 right-2 bg-black/75 px-2 py-1 rounded-md text-xs flex justify-between items-center">
                                                <p className="flex items-center gap-1 text-gray-200">
                                                    <StarIcon className="w-3.5 h-3.5 text-primary fill-primary" />
                                                    {movie.vote_average ? Number(movie.vote_average).toFixed(1) : "N/A"}
                                                </p>
                                                <p className="text-gray-300">
                                                    {kConverter(movie.vote_count || 0)} Votes
                                                </p>
                                            </div>
                                            {isSelected && (
                                                <div className="absolute top-2 right-2 bg-primary h-7 w-7 flex items-center justify-center rounded-full">
                                                    <CheckIcon className="w-4 h-4 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-2 px-1">
                                            <p className="font-medium text-sm truncate">
                                                {movie.title || movie.name}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {movie.release_date || movie.releaseDate}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* PRICE SECTION */}
            <div className="mt-8">
                <label className="block text-sm font-medium mb-2">Show Price</label>
                <div className="inline-flex items-center gap-2 border border-gray-600 px-3 py-2 rounded-md">
                    <p className="text-gray-400 text-sm">{currency}</p>
                    <input
                        type="number"
                        value={showPrice}
                        onChange={(e) => setShowPrice(e.target.value)}
                        className="outline-none bg-transparent text-white"
                        placeholder="Enter price"
                    />
                </div>
            </div>

            {/* DATE/TIME INPUT */}
            <div className="mt-6">
                <label className="block text-sm font-medium mb-2">Select Show Date & Time</label>
                <input
                    type="datetime-local"
                    min={getMinDateTime()}
                    value={dateTimeInput}
                    onChange={(e) => setDateTimeInput(e.target.value)}
                    className="outline-none border p-2 rounded-md bg-transparent border-gray-600 text-white"
                />
                <button
                    type="button"
                    onClick={handleDateTimeAdd}
                    className="ml-3 bg-primary/80 text-white px-3 py-2 text-sm rounded-lg hover:bg-primary"
                >
                    Add Time
                </button>
            </div>

            {/* SELECTED TIMES */}
            {Object.keys(dateTimeSelection).length > 0 && (
                <div className="mt-6">
                    <h2 className="font-medium mb-2">Selected Date-Time</h2>
                    <div className="space-y-3">
                        {Object.entries(dateTimeSelection).map(([date, times]) => (
                            <div key={date}>
                                <p className="font-medium text-sm text-gray-300">{date}</p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {times.map((time) => (
                                        <div
                                            key={time}
                                            className="border border-primary px-2 py-1 flex items-center rounded text-sm bg-primary/10"
                                        >
                                            <span>{time}</span>
                                            <Trash2
                                                onClick={() => handleRemoveTime(date, time)}
                                                size={14}
                                                className="ml-2 text-red-500 hover:text-red-700 cursor-pointer"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* THEATER SELECTION */}
            <div className="mt-6">
                <label className="block text-sm font-medium mb-2">Select Theater</label>
                <select
                    value={selectedTheater}
                    onChange={(e) => setSelectedTheater(e.target.value)}
                    className="w-full max-w-md outline-none border border-gray-600 p-2 rounded-md bg-gray-900 text-white"
                >
                    <option value="">-- Select a theater --</option>
                    {theaters.map((theater) => (
                        <option key={theater._id || theater.id} value={theater._id || theater.id}>
                            {theater.name} - {theater.city || theater.address}
                        </option>
                    ))}
                </select>
            </div>

            {/* SUBMIT BUTTON */}
            <button
                type="button"
                onClick={handleAddShow}
                disabled={addingShow}
                className="bg-primary text-white px-8 py-2 mt-6 rounded hover:bg-primary/90 transition-all cursor-pointer"
            >
                {addingShow ? "Adding..." : "Add Show"}
            </button>
        </>
    );
};

export default AddShows;