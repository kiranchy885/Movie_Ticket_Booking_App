import mongoose from "mongoose";

const showSchema = new mongoose.Schema(
  {
    // ── Movie reference (string _id from TMDB, matches movies._id) ──
    movie: {
      type: String,
      ref: "Movie",
      required: true,
      index: true,
    },

    // ── Show timing & price ──
    showDateTime: {
      type: Date,
      required: true,
      index: true,
    },
    showPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    // ── Seats booked (map of seatId -> userId) ──
    occupiedSeats: {
      type: Object,
      default: {},
    },

    // ── Theater reference (primary link) ──
    theaterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Theater",
      required: true,
      index: true,
    },

    // ── Denormalized snapshot (for fast reads without populate) ──
    theaterName:    { type: String, default: "" },
    theaterCity:    { type: String, default: "" },
    theaterAddress: { type: String, default: "" },
    theaterLat:     { type: Number, default: 0 },
    theaterLng:     { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Compound index: one show per movie + theater + time ──
showSchema.index({ movie: 1, theaterId: 1, showDateTime: 1 }, { unique: true });

// ── Convenience virtual: full theater info in one object ──
showSchema.virtual("theater").get(function () {
  return {
    _id: this.theaterId,
    name: this.theaterName,
    city: this.theaterCity,
    address: this.theaterAddress,
    latitude: this.theaterLat,
    longitude: this.theaterLng,
  };
});

export default mongoose.models.Show || mongoose.model("Show", showSchema);