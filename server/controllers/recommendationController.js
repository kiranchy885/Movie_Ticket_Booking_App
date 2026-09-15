import Booking from "../models/Booking.js";
import User from "../models/User.js";

import {
    getUserBasedRecommendations
} from "../services/recommendationService.js";


export const getRecommendations = async (req, res) => {

    try {

        // =================================================
        // GET AUTHENTICATED USER
        // =================================================

        const userId = req.user?._id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                eligible: false,
                recommendations: []
            });
        }


        // =================================================
        // CHECK BOOKING DIRECTLY
        // =================================================

        const bookingExists =
            await Booking.exists({
                user: userId
            });


        console.log(
            "USER:",
            userId.toString()
        );

        console.log(
            "BOOKING EXISTS:",
            !!bookingExists
        );


        // =================================================
        // NO BOOKING = ABSOLUTELY NO RECOMMENDATION
        // =================================================

        if (!bookingExists) {

            console.log(
                "NO BOOKING -> BLOCK RECOMMENDATION"
            );

            return res.status(200).json({
                success: true,
                eligible: false,
                count: 0,
                recommendations: [],
                requirements: {
                    booking: false,
                    favourite: false,
                    rating: false
                }
            });
        }


        // =================================================
        // GET USER
        // =================================================

        const user =
            await User.findById(userId)
                .lean();


        if (!user) {

            return res.status(404).json({
                success: false,
                eligible: false,
                count: 0,
                recommendations: []
            });
        }


        // =================================================
        // CHECK FAVOURITES
        // =================================================

        const hasFavourite =
            Array.isArray(user.favourites) &&
            user.favourites.length > 0;


        if (!hasFavourite) {

            return res.status(200).json({
                success: true,
                eligible: false,
                count: 0,
                recommendations: [],
                requirements: {
                    booking: true,
                    favourite: false,
                    rating: false
                }
            });
        }


        // =================================================
        // CHECK RATINGS
        // =================================================

        const ratingExists =
            await Rating.exists({
                user: userId
            });


        if (!ratingExists) {

            return res.status(200).json({
                success: true,
                eligible: false,
                count: 0,
                recommendations: [],
                requirements: {
                    booking: true,
                    favourite: true,
                    rating: false
                }
            });
        }


        // =================================================
        // ALL REQUIREMENTS PASSED
        // =================================================

        const parsedLimit =
            parseInt(
                req.query.limit,
                10
            );


        const limit =
            Number.isFinite(parsedLimit) &&
            parsedLimit > 0
                ? Math.min(parsedLimit, 50)
                : 10;


        // =================================================
        // GENERATE RECOMMENDATIONS
        // =================================================

        const recommendations =
            await getUserBasedRecommendations(
                userId,
                limit
            );


        // =================================================
        // RETURN
        // =================================================

        return res.status(200).json({
            success: true,
            eligible: true,
            count: recommendations.length,
            recommendations
        });


    } catch (error) {

        console.error(
            "Recommendation Controller Error:",
            error
        );


        return res.status(500).json({
            success: false,
            eligible: false,
            count: 0,
            recommendations: [],
            message:
                "Failed to generate recommendations",
            error: error.message
        });

    }

};
