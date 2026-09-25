import mongoose from "mongoose";

// =====================================================
// SEAT LAYOUT SUB-SCHEMA
// Defines the physical layout of seats in a screen
// =====================================================
const seatLayoutSchema = new mongoose.Schema(
    {
        // Rows like ["A", "B", "C", ...]
        rows: {
            type: [String],
            default: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
        },

        // Seats per row (some rows can be split with a gap)
        // Example: { A: 9, B: 9, C: 9, D: 9, E: 9, ... }
        seatsPerRow: {
            type: mongoose.Schema.Types.Mixed,
            default: {
                A: 9,
                B: 9,
                C: 9,
                D: 9,
                E: 9,
                F: 9,
                G: 9,
                H: 9,
                I: 9,
                J: 9,
            },
        },

        // Which rows belong to which seat type
        // Example: { STANDARD: ["A","B","C","D"], LOVE: ["E","F","G","H"], VIP: ["I","J"] }
        rowTypes: {
            type: mongoose.Schema.Types.Mixed,
            default: {
                STANDARD: ["A", "B", "C", "D"],
                LOVE: ["E", "F", "G", "H"],
                VIP: ["I", "J"],
            },
        },
    },
    { _id: false }
);

// =====================================================
// SCREEN / AUDI SUB-SCHEMA
// One theater can have multiple screens (Audi 1, Audi 2, ...)
// =====================================================
const screenSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            default: "Screen 1",
            trim: true,
        },
        totalSeats: {
            type: Number,
            default: 90,
        },
        layout: {
            type: seatLayoutSchema,
            default: () => ({}),
        },
    },
    { _id: true }
);

// =====================================================
// MAIN THEATER SCHEMA
// =====================================================
const theaterSchema = new mongoose.Schema(
    {
        // ─────────────────────────────────────────────
        // BASIC INFO
        // ─────────────────────────────────────────────
        name: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        city: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        address: {
            type: String,
            required: true,
            trim: true,
        },

        // ─────────────────────────────────────────────
        // LOCATION
        // ─────────────────────────────────────────────
        location: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point",
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                required: true,
                validate: {
                    validator: function (coords) {
                        return (
                            Array.isArray(coords) &&
                            coords.length === 2 &&
                            typeof coords[0] === "number" &&
                            typeof coords[1] === "number"
                        );
                    },
                    message: "Coordinates must be [longitude, latitude]",
                },
            },
        },
        latitude: {
            type: Number,
            default: 0,
        },
        longitude: {
            type: Number,
            default: 0,
        },

        // ─────────────────────────────────────────────
        // CONTACT / MEDIA
        // ─────────────────────────────────────────────
        phone: { type: String, default: "" },
        email: { type: String, default: "" },
        image: { type: String, default: "" },
        isActive: { type: Boolean, default: true },

        // ─────────────────────────────────────────────
        // MOVIES SHOWING AT THIS THEATER
        // Stores Movie._id as string (matches movies table _id)
        // ─────────────────────────────────────────────
        movies: [
            {
                type: String,
                ref: "Movie",
            },
        ],

        // ─────────────────────────────────────────────
        // SEAT PRICING (default for this theater)
        // Can be overridden per show via Show.seatPrices
        // ─────────────────────────────────────────────
        seatPrices: {
            standard: { type: Number, default: 150 },
            love: { type: Number, default: 250 },
            vip: { type: Number, default: 400 },
        },

        // ─────────────────────────────────────────────
        // SCREENS / AUDIS
        // Each theater can have multiple screens
        // ─────────────────────────────────────────────
        screens: {
            type: [screenSchema],
            default: [],
        },

        // ─────────────────────────────────────────────
        // OCCUPIED SEATS PER SHOW (mapped to user)
        //
        // Shape: {
        //   "showId1": { "A1": "userId1", "A2": "userId1", "B5": "userId2" },
        //   "showId2": { "C3": "userId3" }
        // }
        //
        // Keyed by Show._id so each show has its own seat map.
        // Value is { seatLabel: userId }.
        // ─────────────────────────────────────────────
        occupiedSeatsByShow: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },

        // ─────────────────────────────────────────────
        // FULL BOOKING REFERENCES
        // Lets you populate("bookings") to get user + show + seats
        // ─────────────────────────────────────────────
        bookings: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Booking",
            },
        ],
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// =====================================================
// INDEXES
// =====================================================

// Geospatial index for nearby search
theaterSchema.index({ location: "2dsphere" });

// Search by name or city
theaterSchema.index({ name: "text", city: "text" });

// =====================================================
// PRE-SAVE HOOK
// Keep location in sync with latitude/longitude
// =====================================================
theaterSchema.pre("save", function (next) {
    if (
        typeof this.latitude === "number" &&
        typeof this.longitude === "number" &&
        (this.latitude !== 0 || this.longitude !== 0)
    ) {
        this.location = {
            type: "Point",
            coordinates: [this.longitude, this.latitude],
        };
    }
    next();
});

// =====================================================
// VIRTUAL: displayName
// =====================================================
theaterSchema.virtual("displayName").get(function () {
    return `${this.name}${this.city ? ` — ${this.city}` : ""}`;
});

// =====================================================
// INSTANCE METHODS
// =====================================================

// Add a seat booking to this theater for a specific show
theaterSchema.methods.bookSeats = function (showId, seats, userId) {
    if (!this.occupiedSeatsByShow) this.occupiedSeatsByShow = {};

    const key = String(showId);
    const map =
        this.occupiedSeatsByShow[key] &&
        typeof this.occupiedSeatsByShow[key] === "object"
            ? this.occupiedSeatsByShow[key]
            : {};

    seats.forEach((seat) => {
        map[seat] = String(userId);
    });

    this.occupiedSeatsByShow[key] = map;
    this.markModified("occupiedSeatsByShow");
    return this;
};

// Get occupied seat labels for a show
theaterSchema.methods.getOccupiedSeats = function (showId) {
    const map = this.occupiedSeatsByShow?.[String(showId)];
    if (!map) return [];
    if (Array.isArray(map)) return map;
    return Object.keys(map);
};

// Get the user who booked a specific seat
theaterSchema.methods.getSeatOwner = function (showId, seat) {
    const map = this.occupiedSeatsByShow?.[String(showId)];
    if (!map || Array.isArray(map)) return null;
    return map[seat] || null;
};

const Theater =
    mongoose.models.Theater || mongoose.model("Theater", theaterSchema);

export default Theater;