import Theater from "../models/Theater.js";
import Movie from "../models/Movie.js";
// =====================================================
// DUMMY THEATERS (Kathmandu Valley) – embedded here
// =====================================================
const dummyTheaters = [
    {
        name: "QFX Civil Mall",
        address: "Civil Trade Centre, Sundhara",
        city: "Kathmandu",
        latitude: 27.7000,
        longitude: 85.3167,
    },
    {
        name: "QFX Chhaya Center",
        address: "Chhaya Center, Thamel",
        city: "Kathmandu",
        latitude: 27.7133,
        longitude: 85.3153,
    },
    {
        name: "QFX Durbar Cinemax",
        address: "Durbar Mall, Durbarmarg",
        city: "Kathmandu",
        latitude: 27.7064,
        longitude: 85.3185,
    },
    {
        name: "QFX Labim Mall",
        address: "Labim Mall, Pulchowk",
        city: "Lalitpur",
        latitude: 27.6733,
        longitude: 85.3215,
    },
    {
        name: "QFX Rising Mall",
        address: "Rising Mall, Kathmandu",
        city: "Kathmandu",
        latitude: 27.6967,
        longitude: 85.3142,
    },
    {
        name: "QFX Thimi",
        address: "Bhaktapur",
        city: "Bhaktapur",
        latitude: 27.6728,
        longitude: 85.4299,
    },
    {
        name: "Ranjana Cineplex",
        address: "New Road, Kathmandu",
        city: "Kathmandu",
        latitude: 27.7042,
        longitude: 85.3101,
    },
    {
        name: "Bishwojyoti Cineplex",
        address: "Kathmandu",
        city: "Kathmandu",
        latitude: 27.7024,
        longitude: 85.3161,
    },
    {
        name: "Cine de Chef",
        address: "Civil Trade Centre, Sundhara",
        city: "Kathmandu",
        latitude: 27.7000,
        longitude: 85.3167,
    },
    {
        name: "Guna Cinema",
        address: "Gwarko, Lalitpur",
        city: "Lalitpur",
        latitude: 27.6578,
        longitude: 85.3233,
    },
    {
        name: "FCube Cinemas",
        address: "KL Tower, Chabahil",
        city: "Kathmandu",
        latitude: 27.7233,
        longitude: 85.3389,
    },
    {
        name: "One Cinemas",
        address: "Eyeplex Mall, New Baneshwor",
        city: "Kathmandu",
        latitude: 27.6914,
        longitude: 85.3350,
    },
    {
        name: "Jai Nepal Cinemas",
        address: "Narayanhiti Marg, Kathmandu",
        city: "Kathmandu",
        latitude: 27.7100,
        longitude: 85.3133,
    },
    {
        name: "Asta Narayan Pictures",
        address: "Balaju, Kathmandu",
        city: "Kathmandu",
        latitude: 27.7167,
        longitude: 85.3089,
    },
    {
        name: "BSR Movies",
        address: "Gongabu, Kathmandu",
        city: "Kathmandu",
        latitude: 27.7211,
        longitude: 85.3167,
    },
    {
        name: "Infinity Movies",
        address: "Gongabu, Kathmandu",
        city: "Kathmandu",
        latitude: 27.7211,
        longitude: 85.3167,
    },
    {
        name: "INI Lotse Cinemas",
        address: "Naya Buspark, Kathmandu",
        city: "Kathmandu",
        latitude: 27.7100,
        longitude: 85.3300,
    },
    {
        name: "INI Screenplay Cinemas",
        address: "Baneshwor, Kathmandu",
        city: "Kathmandu",
        latitude: 27.6894,
        longitude: 85.3333,
    },
    {
        name: "Kirtipur Cineplex",
        address: "Kirtipur, Kathmandu",
        city: "Kathmandu",
        latitude: 27.6744,
        longitude: 85.2786,
    },
    {
        name: "Metro Plaza Cinema Complex",
        address: "Kuleshwor, Kathmandu",
        city: "Kathmandu",
        latitude: 27.6944,
        longitude: 85.2800,
    },
    {
        name: "MidTown Cinemas",
        address: "Kathmandu",
        city: "Kathmandu",
        latitude: 27.7000,
        longitude: 85.3167,
    },
    {
        name: "Mandala Theatre",
        address: "Kathmandu",
        city: "Kathmandu",
        latitude: 27.7000,
        longitude: 85.3167,
    },
    {
        name: "City Square Mall (QFX)",
        address: "Samakhusi, Kathmandu",
        city: "Kathmandu",
        latitude: 27.7292,
        longitude: 85.3181,
    },
];

// =====================================================
// SEED THEATERS – inserts any missing from dummyTheaters
// =====================================================
export const seedTheaters = async () => {
    try {
        const count = await Theater.countDocuments();
        if (count === 0) {
            // No theaters at all – insert all dummy theaters
            const theatersToInsert = dummyTheaters.map((t) => ({
                name: t.name,
                address: t.address || "",
                city: t.city || "",
                latitude: t.latitude || 0,
                longitude: t.longitude || 0,
                location: {
                    type: "Point",
                    coordinates: [t.longitude || 0, t.latitude || 0],
                },
                isActive: true,
            }));
            await Theater.insertMany(theatersToInsert);
            console.log(`✅ ${theatersToInsert.length} theaters seeded successfully!`);
        } else {
            // Some theaters already exist – upsert missing ones by name
            let inserted = 0;
            for (const t of dummyTheaters) {
                const result = await Theater.updateOne(
                    { name: t.name },
                    {
                        $set: {
                            address: t.address || "",
                            city: t.city || "",
                            latitude: t.latitude || 0,
                            longitude: t.longitude || 0,
                            location: {
                                type: "Point",
                                coordinates: [t.longitude || 0, t.latitude || 0],
                            },
                            isActive: true,
                        },
                    },
                    { upsert: true }
                );
                if (result.upsertedCount > 0) inserted++;
            }
            if (inserted > 0) {
                console.log(`✅ ${inserted} new theaters added.`);
            } else {
                console.log(`ℹ️ All ${dummyTheaters.length} theaters already exist.`);
            }
        }
    } catch (error) {
        console.error("❌ Error seeding theaters:", error);
    }
};

// =====================================================
// GET NEARBY THEATERS
// =====================================================
export const getNearbyTheaters = async (req, res) => {
    try {
        const { latitude, longitude } = req.query;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: "Latitude and longitude are required",
            });
        }

        const theaters = await Theater.find({
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [parseFloat(longitude), parseFloat(latitude)],
                    },
                    $maxDistance: 10000, // 10km radius
                },
            },
        });

        res.status(200).json({
            success: true,
            theaters,
        });
    } catch (error) {
        console.error("Error fetching nearby theaters:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};

// =====================================================
// GET ALL THEATERS
// =====================================================
export const getAllTheaters = async (req, res) => {
    try {
        const theaters = await Theater.find().sort({ name: 1 });
        return res.status(200).json({
            success: true,
            theaters,
        });
    } catch (error) {
        console.error("Get All Theaters Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =====================================================
// GET THEATER BY ID
// =====================================================
export const getTheaterById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Theater ID is required",
            });
        }

        const theater = await Theater.findById(id);
        if (!theater) {
            return res.status(404).json({
                success: false,
                message: "Theater not found",
            });
        }

        return res.status(200).json({
            success: true,
            theater,
        });
    } catch (error) {
        console.error("Get Theater By ID Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =====================================================
// ADD THEATER
// =====================================================
export const addTheater = async (req, res) => {
    try {
        const { name, city, address, latitude, longitude, phone, email, image } = req.body;

        if (!name || !city || !address) {
            return res.status(400).json({
                success: false,
                message: "Name, city, and address are required",
            });
        }

        if (latitude === undefined || longitude === undefined) {
            return res.status(400).json({
                success: false,
                message: "Latitude and longitude are required",
            });
        }

        const location = {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
        };

        const theater = await Theater.create({
            name,
            city,
            address,
            location,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            phone: phone || "",
            email: email || "",
            image: image || "",
            isActive: true,
        });

        return res.status(201).json({
            success: true,
            message: "Theater added successfully",
            theater,
        });
    } catch (error) {
        console.error("Add Theater Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =====================================================
// UPDATE THEATER
// =====================================================
export const updateTheater = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Theater ID is required",
            });
        }

        if (updates.latitude !== undefined && updates.longitude !== undefined) {
            updates.location = {
                type: "Point",
                coordinates: [parseFloat(updates.longitude), parseFloat(updates.latitude)],
            };
        }

        const theater = await Theater.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true,
        });

        if (!theater) {
            return res.status(404).json({
                success: false,
                message: "Theater not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Theater updated successfully",
            theater,
        });
    } catch (error) {
        console.error("Update Theater Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =====================================================
// DELETE THEATER
// =====================================================
export const deleteTheater = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Theater ID is required",
            });
        }

        const theater = await Theater.findByIdAndDelete(id);

        if (!theater) {
            return res.status(404).json({
                success: false,
                message: "Theater not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Theater deleted successfully",
            theater,
        });
    } catch (error) {
        console.error("Delete Theater Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =====================================================
// GET THEATERS WITH MOVIES
// =====================================================

export const getTheatersWithMovies = async (req, res) => {
    try {
        const theaters = await Theater.find({
            isActive: true,
        }).sort({ name: 1 });

        // Get all movies from movies collection
        const movies = await Movie.find().sort({ title: 1 });

        // Attach movies to every theater
        const theatersWithMovies = theaters.map((theater) => ({
            ...theater.toObject(),
            movies: movies,
        }));

        return res.status(200).json({
            success: true,
            theaters: theatersWithMovies,
        });
    } catch (error) {
        console.error("Get Theaters With Movies Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch theaters with movies",
            error: error.message,
        });
    }
};