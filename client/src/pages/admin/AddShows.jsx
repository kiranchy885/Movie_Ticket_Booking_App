import React, {
    useEffect,
    useState
} from "react";

import Title from "../../components/admin/Title";
import Loading from "../../components/Loading";

import { dummyShowsData } from "../../assets/assets";

import {
    StarIcon,
    CheckIcon,
    Trash2
} from "lucide-react";

import { kConverter } from "../../lib/kConverter";


const AddShows = () => {

    const currency =
        import.meta.env.VITE_CURRENCY ||
        "Rs.";


    const [
        nowPlayingMovies,
        setNowPlayingMovies
    ] = useState([]);


    const [
        selectedMovie,
        setSelectedMovie
    ] = useState(null);


    const [
        showPrice,
        setShowPrice
    ] = useState("");


    const [
        dateTimeInput,
        setDateTimeInput
    ] = useState("");


    const [
        dateTimeSelection,
        setDateTimeSelection
    ] = useState({});


    const [
        loading,
        setLoading
    ] = useState(true);


    const [
        addingShow,
        setAddingShow
    ] = useState(false);


    // =====================================================
    // LOAD MOVIES
    // =====================================================

    useEffect(() => {

        setNowPlayingMovies(
            dummyShowsData || []
        );

        setLoading(false);

    }, []);


    // =====================================================
    // ADD DATE AND TIME
    // =====================================================

    const handleDateTimeAdd = () => {

        if (!dateTimeInput) {

            alert(
                "Please select a date and time."
            );

            return;
        }


        const [
            date,
            time
        ] =
            dateTimeInput.split("T");


        if (!date || !time) {

            alert(
                "Invalid date and time."
            );

            return;
        }


        setDateTimeSelection(
            (prev) => {

                const existingTimes =
                    prev[date] || [];


                if (
                    existingTimes.includes(
                        time
                    )
                ) {

                    alert(
                        "This date and time is already added."
                    );

                    return prev;
                }


                return {

                    ...prev,

                    [date]: [
                        ...existingTimes,
                        time
                    ]

                };

            }
        );


        setDateTimeInput("");
    };


    // =====================================================
    // REMOVE DATE/TIME
    // =====================================================

    const handleRemoveTime = (
        date,
        time
    ) => {

        setDateTimeSelection(
            (prev) => {

                const filteredTimes =
                    (
                        prev[date] ||
                        []
                    ).filter(
                        (item) =>
                            item !== time
                    );


                if (
                    filteredTimes.length ===
                    0
                ) {

                    const {
                        [date]: removed,
                        ...rest
                    } = prev;

                    return rest;
                }


                return {

                    ...prev,

                    [date]:
                        filteredTimes

                };

            }
        );
    };


    // =====================================================
    // ADD SHOW
    // =====================================================

    const handleAddShow =
        async () => {

            // =============================================
            // CHECK MOVIE
            // =============================================

            if (!selectedMovie) {

                alert(
                    "Please select a movie."
                );

                return;
            }


            // =============================================
            // CHECK PRICE
            // =============================================

            if (
                !showPrice ||
                Number(showPrice) <= 0
            ) {

                alert(
                    "Please enter a valid show price."
                );

                return;
            }


            // =============================================
            // CHECK DATE/TIME
            // =============================================

            if (
                Object.keys(
                    dateTimeSelection
                ).length === 0
            ) {

                alert(
                    "Please add at least one show date and time."
                );

                return;
            }


            try {

                setAddingShow(true);


                // =============================================
                // SHOW DATA
                // =============================================

                const showData = {

                    movie:
                        selectedMovie,

                    price:
                        Number(showPrice),

                    dateTimes:
                        dateTimeSelection

                };


                console.log(
                    "Sending show data:",
                    showData
                );


                // =============================================
                // SEND TO BACKEND
                // =============================================

                const response =
                    await fetch(
                        "http://localhost:5000/show/add",
                        {

                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify(
                                    showData
                                )

                        }
                    );


                // =============================================
                // GET RESPONSE
                // =============================================

                const data =
                    await response.json();


                console.log(
                    "Backend response:",
                    data
                );


                // =============================================
                // ERROR
                // =============================================

                if (
                    !response.ok ||
                    !data.success
                ) {

                    throw new Error(
                        data.message ||
                        "Failed to add show"
                    );
                }


                // =============================================
                // SUCCESS
                // =============================================

                alert(
                    "Movie and show added successfully!"
                );


                // =============================================
                // CLEAR FORM
                // =============================================

                setSelectedMovie(null);

                setShowPrice("");

                setDateTimeInput("");

                setDateTimeSelection({});


            } catch (error) {

                console.error(
                    "Error adding show:",
                    error
                );


                alert(
                    error.message ||
                    "Failed to add show."
                );


            } finally {

                setAddingShow(false);
            }
        };


    // =====================================================
    // LOADING
    // =====================================================

    if (loading) {

        return <Loading />;
    }


    // =====================================================
    // PAGE
    // =====================================================

    return (

        <>

            <Title
                text1="Add"
                text2="Shows"
            />


            {/* ================================================= */}
            {/* MOVIES */}
            {/* ================================================= */}

            <div className="mt-10">

                <p className="
                    text-lg
                    font-medium
                ">

                    Now Playing Movies

                </p>


                <div className="
                    mt-4
                    overflow-x-auto
                    pb-5
                    scrollbar-thin
                ">

                    <div className="
                        flex
                        gap-5
                        w-max
                    ">

                        {nowPlayingMovies.map(
                            (movie) => {

                                const movieId =
                                    movie.id ||
                                    movie._id;


                                const isSelected =
                                    String(
                                        selectedMovie?.id ||
                                        selectedMovie?._id
                                    ) ===
                                    String(
                                        movieId
                                    );


                                return (

                                    <div
                                        key={movieId}
                                        onClick={() =>
                                            setSelectedMovie(
                                                movie
                                            )
                                        }
                                        className="
                                            w-40
                                            shrink-0
                                            cursor-pointer
                                            group
                                        "
                                    >

                                        <div
                                            className={`
                                                relative
                                                w-40
                                                h-60
                                                overflow-hidden
                                                rounded-lg
                                                shadow-md
                                                border-2
                                                transition-all
                                                ${
                                                    isSelected
                                                        ? "border-primary"
                                                        : "border-transparent"
                                                }
                                            `}
                                        >

                                            <img
                                                src={
                                                    movie.poster_path ||
                                                    movie.poster ||
                                                    movie.image
                                                }
                                                alt={
                                                    movie.title ||
                                                    movie.name ||
                                                    "Movie"
                                                }
                                                className="
                                                    w-full
                                                    h-full
                                                    object-cover
                                                    brightness-90
                                                    group-hover:brightness-100
                                                    group-hover:scale-105
                                                    transition
                                                    duration-300
                                                "
                                            />


                                            <div className="
                                                absolute
                                                bottom-0
                                                left-2
                                                right-2
                                                bg-black/75
                                                px-2
                                                py-1
                                                rounded-md
                                                text-xs
                                                flex
                                                justify-between
                                                items-center
                                            ">

                                                <p className="
                                                    flex
                                                    items-center
                                                    gap-1
                                                    text-gray-200
                                                ">

                                                    <StarIcon
                                                        className="
                                                            w-3.5
                                                            h-3.5
                                                            text-primary
                                                            fill-primary
                                                        "
                                                    />

                                                    {movie.vote_average
                                                        ? Number(
                                                            movie.vote_average
                                                        ).toFixed(1)
                                                        : "N/A"}

                                                </p>


                                                <p className="
                                                    text-gray-300
                                                ">

                                                    {kConverter(
                                                        movie.vote_count ||
                                                        0
                                                    )}{" "}
                                                    Votes

                                                </p>

                                            </div>


                                            {isSelected && (

                                                <div className="
                                                    absolute
                                                    top-2
                                                    right-2
                                                    bg-primary
                                                    h-7
                                                    w-7
                                                    flex
                                                    items-center
                                                    justify-center
                                                    rounded-full
                                                ">

                                                    <CheckIcon
                                                        className="
                                                            w-4
                                                            h-4
                                                            text-white
                                                        "
                                                    />

                                                </div>

                                            )}

                                        </div>


                                        <div className="
                                            mt-2
                                            px-1
                                        ">

                                            <p className="
                                                font-medium
                                                text-sm
                                                truncate
                                            ">

                                                {movie.title ||
                                                    movie.name ||
                                                    "Untitled Movie"}

                                            </p>


                                            <p className="
                                                text-xs
                                                text-gray-400
                                            ">

                                                {movie.release_date ||
                                                    movie.releaseDate ||
                                                    "Release date unavailable"}

                                            </p>

                                        </div>

                                    </div>

                                );

                            }
                        )}

                    </div>

                </div>

            </div>


            {/* ================================================= */}
            {/* PRICE */}
            {/* ================================================= */}

            <div className="mt-8">

                <label className="
                    block
                    text-sm
                    font-medium
                    mb-2
                ">

                    Show Price

                </label>


                <div className="
                    inline-flex
                    items-center
                    gap-2
                    border
                    border-gray-600
                    px-3
                    py-2
                    rounded-md
                ">

                    <p className="
                        text-gray-400
                        text-sm
                    ">

                        {currency}

                    </p>


                    <input
                        type="number"
                        min="0"
                        value={showPrice}
                        onChange={(e) =>
                            setShowPrice(
                                e.target.value
                            )
                        }
                        className="
                            outline-none
                            bg-transparent
                            text-white
                        "
                        placeholder="Enter price"
                    />

                </div>

            </div>


            {/* ================================================= */}
            {/* DATE/TIME */}
            {/* ================================================= */}

            <div className="mt-6">

                <label className="
                    block
                    text-sm
                    font-medium
                    mb-2
                ">

                    Select Show Date & Time

                </label>


                <input
                    type="datetime-local"
                    value={dateTimeInput}
                    onChange={(e) =>
                        setDateTimeInput(
                            e.target.value
                        )
                    }
                    className="
                        outline-none
                        border
                        p-2
                        rounded-md
                        bg-transparent
                    "
                />


                <button
                    type="button"
                    onClick={
                        handleDateTimeAdd
                    }
                    className="
                        ml-3
                        bg-primary/80
                        text-white
                        px-3
                        py-2
                        text-sm
                        rounded-lg
                        hover:bg-primary
                    "
                >

                    Add Time

                </button>

            </div>


            {/* ================================================= */}
            {/* SELECTED TIMES */}
            {/* ================================================= */}

            {Object.keys(
                dateTimeSelection
            ).length > 0 && (

                <div className="mt-6">

                    <h2 className="
                        font-medium
                        mb-2
                    ">

                        Selected Date-Time

                    </h2>


                    <div className="
                        space-y-3
                    ">

                        {Object.entries(
                            dateTimeSelection
                        ).map(
                            ([date, times]) => (

                                <div
                                    key={date}
                                >

                                    <p className="
                                        font-medium
                                    ">

                                        {date}

                                    </p>


                                    <div className="
                                        flex
                                        flex-wrap
                                        gap-2
                                        mt-1
                                    ">

                                        {times.map(
                                            (time) => (

                                                <div
                                                    key={`${date}-${time}`}
                                                    className="
                                                        border
                                                        border-primary
                                                        px-2
                                                        py-1
                                                        flex
                                                        items-center
                                                        rounded
                                                        text-sm
                                                    "
                                                >

                                                    <span>
                                                        {time}
                                                    </span>


                                                    <Trash2
                                                        onClick={() =>
                                                            handleRemoveTime(
                                                                date,
                                                                time
                                                            )
                                                        }
                                                        size={14}
                                                        className="
                                                            ml-2
                                                            text-red-500
                                                            hover:text-red-700
                                                            cursor-pointer
                                                        "
                                                    />

                                                </div>

                                            )
                                        )}

                                    </div>

                                </div>

                            )
                        )}

                    </div>

                </div>

            )}


            {/* ================================================= */}
            {/* ADD SHOW */}
            {/* ================================================= */}

            <button
                type="button"
                onClick={
                    handleAddShow
                }
                disabled={
                    addingShow
                }
                className={`
                    bg-primary
                    text-white
                    px-8
                    py-2
                    mt-6
                    rounded
                    transition-all
                    ${
                        addingShow
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-primary/90 cursor-pointer"
                    }
                `}
            >

                {addingShow
                    ? "Adding Show..."
                    : "Add Show"}

            </button>

        </>
    );
};


export default AddShows;