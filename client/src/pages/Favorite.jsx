import React, {
  useEffect,
  useState,
} from "react";

import BlurCircle from "../components/BlurCircle";
import MovieCard from "../components/MovieCard";

const Favorite = () => {

  const [favoriteMovies, setFavoriteMovies] =
    useState([]);

  const [loading, setLoading] =
    useState(true);


  // =====================================================
  // FETCH FAVORITE MOVIES
  // =====================================================

  const fetchFavoriteMovies = async () => {

    try {

      setLoading(true);

      // =================================================
      // GET JWT TOKEN
      // =================================================

      const token =
        localStorage.getItem("token");

      // =================================================
      // USER NOT LOGGED IN
      // =================================================

      if (!token) {

        setFavoriteMovies([]);

        return;
      }


      // =================================================
      // GET CURRENT USER
      // =================================================

      const response =
        await fetch(
          "http://localhost:5000/user/me",
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );


      // =================================================
      // TOKEN EXPIRED
      // =================================================

      if (
        response.status === 401
      ) {

        localStorage.removeItem(
          "token"
        );

        setFavoriteMovies([]);

        return;
      }


      // =================================================
      // OTHER SERVER ERROR
      // =================================================

      if (!response.ok) {

        throw new Error(
          `Server error: ${response.status}`
        );
      }


      // =================================================
      // READ JSON
      // =================================================

      const data =
        await response.json();


      console.log(
        "Current user:",
        data.user
      );


      // =================================================
      // GET FAVOURITES
      // =================================================

      const favourites =
        Array.isArray(
          data.user?.favourites
        )
          ? data.user.favourites
          : [];


      console.log(
        "Raw favourites:",
        favourites
      );


      // =================================================
      // GET POPULATED MOVIE OBJECTS
      // =================================================
      //
      // Because userController has:
      //
      // .populate("favourites")
      //
      // favourites should contain complete Movie
      // documents.
      //
      // =================================================

      const movies =
        favourites.filter(
          (movie) => {

            return (
              movie &&
              typeof movie === "object" &&
              movie._id !== undefined &&
              movie._id !== null
            );

          }
        );


      console.log(
        "Favourite movie objects:",
        movies
      );


      // =================================================
      // SAVE MOVIES
      // =================================================

      setFavoriteMovies(
        movies
      );

    } catch (error) {

      console.error(
        "Error fetching favourite movies:",
        error
      );

      setFavoriteMovies([]);

    } finally {

      setLoading(false);

    }

  };


  // =====================================================
  // FETCH WHEN PAGE OPENS
  // =====================================================

  useEffect(() => {

    fetchFavoriteMovies();

  }, []);


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {

    return (

      <div className="flex items-center justify-center h-screen">

        <h1 className="text-xl font-medium">

          Loading favourite movies...

        </h1>

      </div>

    );

  }


  // =====================================================
  // CHECK LOGIN
  // =====================================================

  const token =
    localStorage.getItem("token");


  if (!token) {

    return (

      <div className="flex flex-col items-center justify-center h-screen px-6">

        <h1 className="text-3xl font-bold text-center">

          Please login to view your favourite movies

        </h1>


        <p className="text-gray-400 mt-3 text-center">

          Login to save and view your favourite movies.

        </p>

      </div>

    );

  }


  // =====================================================
  // NO FAVOURITES
  // =====================================================

  if (
    favoriteMovies.length === 0
  ) {

    return (

      <div className="relative my-40 mb-60 px-6 md:px-16 lg:px-40 xl:px-44 overflow-hidden min-h-[60vh]">

        <BlurCircle
          top="150px"
          left="0px"
        />

        <BlurCircle
          bottom="50px"
          right="50px"
        />


        <div className="flex flex-col items-center justify-center h-[50vh]">

          <h1 className="text-3xl font-bold text-center">

            No favourite movies

          </h1>


          <p className="text-gray-400 mt-3 text-center">

            Movies you add to favourites will appear here.

          </p>

        </div>

      </div>

    );

  }


  // =====================================================
  // DISPLAY FAVOURITES
  // =====================================================

  return (

    <div className="relative my-40 mb-60 px-6 md:px-16 lg:px-40 xl:px-44 overflow-hidden min-h-[480vh]">

      <BlurCircle
        top="150px"
        left="0px"
      />

      <BlurCircle
        bottom="50px"
        right="50px"
      />


      {/* ================================================= */}
      {/* TITLE */}
      {/* ================================================= */}

      <h1 className="text-lg font-medium my-4">

        My Favourite Movies

      </h1>


      {/* ================================================= */}
      {/* MOVIE GRID */}
      {/* ================================================= */}

      <div className="flex flex-wrap max-sm:justify-center gap-8">

        {favoriteMovies.map(
          (movie) => (

            <MovieCard
              key={String(movie._id)}
              movie={movie}
            />

          )
        )}

      </div>

    </div>

  );

};

export default Favorite;