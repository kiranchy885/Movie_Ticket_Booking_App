import MovieCenter from "../models/MovieCenter.js";

// ==========================================
// HAVERSINE DISTANCE FORMULA
// ==========================================

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in KM

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return R * c;
};

// ==========================================
// GET NEAREST MOVIE CENTERS
// ==========================================

export const getNearestCenters = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    console.log("--------------------------------");
    console.log("Received latitude:", latitude);
    console.log("Received longitude:", longitude);

    // ==========================================
    // CHECK LOCATION
    // ==========================================

    if (
      latitude === undefined ||
      longitude === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Latitude and longitude are required.",
      });
    }

    const userLat = Number(latitude);
    const userLon = Number(longitude);

    // ==========================================
    // CHECK VALID COORDINATES
    // ==========================================

    if (
      Number.isNaN(userLat) ||
      Number.isNaN(userLon)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid coordinates.",
      });
    }

    if (userLat < -90 || userLat > 90) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude.",
      });
    }

    if (userLon < -180 || userLon > 180) {
      return res.status(400).json({
        success: false,
        message: "Invalid longitude.",
      });
    }

    // ==========================================
    // GET ALL MOVIE CENTERS
    // ==========================================

    const centers = await MovieCenter.find({});

    console.log(
      "Total movie centers found:",
      centers.length
    );

    // VERY IMPORTANT
    console.log(
      "Movie center documents:",
      JSON.stringify(centers, null, 2)
    );

    // ==========================================
    // NO CENTERS
    // ==========================================

    if (centers.length === 0) {
      console.log(
        "WARNING: MongoDB returned ZERO movie centers."
      );

      return res.status(200).json({
        success: true,
        centers: [],
        message:
          "No movie centers found in database.",
      });
    }

    // ==========================================
    // CALCULATE DISTANCE
    // ==========================================

    const centersWithDistance = centers
      .map((center) => {
        const centerLat = Number(center.latitude);
        const centerLon = Number(center.longitude);

        console.log(
          `Checking ${center.name}:`,
          centerLat,
          centerLon
        );

        // Check invalid center coordinates
        if (
          Number.isNaN(centerLat) ||
          Number.isNaN(centerLon)
        ) {
          console.log(
            `Invalid coordinates for ${center.name}`
          );

          return null;
        }

        const distance = calculateDistance(
          userLat,
          userLon,
          centerLat,
          centerLon
        );

        return {
          ...center.toObject(),

          distance: Number(
            distance.toFixed(2)
          ),
        };
      })
      .filter(Boolean);

    // ==========================================
    // SORT NEAREST FIRST
    // ==========================================

    centersWithDistance.sort(
      (a, b) => a.distance - b.distance
    );

    console.log(
      "Sorted movie centers:"
    );

    console.log(
      JSON.stringify(
        centersWithDistance,
        null,
        2
      )
    );

    // ==========================================
    // SEND RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,
      centers: centersWithDistance,
    });

  } catch (error) {
    console.error(
      "GET NEAREST CENTERS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to find nearby movie centers.",
      error: error.message,
    });
  }
};