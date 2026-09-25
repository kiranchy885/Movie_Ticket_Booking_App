// controllers/bookingController.js
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import User from "../models/User.js";
import Theater from "../models/Theater.js";
import { sendEmail } from "../utils/sendEmail.js";
import stripe from "../services/stripeService.js";

// =====================================================
// SEAT PRICING MODEL (must match the frontend)
// -----------------------------------------------------
//   STANDARD (FRONT / screen side) = show price + 20 %  -> 120 %
//   PREMIUM  (BACK  / end)         = show price + 15 %  -> 115 %
//   REGULAR  (MIDDLE)              = show price         -> 100 %
// =====================================================

const SEAT_TYPE_PERCENTAGES = {
    STANDARD: 120,
    PREMIUM: 115,
    REGULAR: 100,
};

const FRONT_ROWS = ["A", "B", "C", "D"];
const MIDDLE_ROWS = ["E", "F", "G", "H"];
const BACK_ROWS = ["I", "J"];

const getSeatTypeByRow = (seat) => {
    const row = String(seat).charAt(0).toUpperCase();
    if (BACK_ROWS.includes(row)) return "PREMIUM";
    if (MIDDLE_ROWS.includes(row)) return "REGULAR";
    return "STANDARD";
};

const normalizeSeatType = (value) => {
    if (!value) return null;
    const v = String(value).trim().toUpperCase();
    if (v === "STANDARD" || v === "REGULAR" || v === "PREMIUM") return v;
    if (v === "VIP") return "PREMIUM";
    if (v === "LOVE") return "REGULAR";
    return null;
};

// =====================================================
// RESERVATION WINDOW
// -----------------------------------------------------
// An UNPAID booking holds its seats for this long.
// =====================================================

const RESERVATION_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

// =====================================================
// ID NORMALIZATION HELPERS
// -----------------------------------------------------
// The user.bookings array historically stored a mix of
// ObjectId and String values. These helpers give us ONE
// canonical representation (string) and a way to match
// any entry regardless of how it was stored.
// =====================================================

const toIdString = (value) => {
    if (value == null) return null;
    if (typeof value === "string") return value;
    if (value._id) return String(value._id);
    try {
        return String(value);
    } catch {
        return null;
    }
};

const isSameId = (a, b) => {
    const sa = toIdString(a);
    const sb = toIdString(b);
    return sa !== null && sb !== null && sa === sb;
};

// Return a cleaned, deduped, string-only version of any
// array of user.bookings entries, keeping only those that
// are in the provided validIdSet.
const cleanBookingArray = (entries, validIdSet) => {
    const out = [];
    const seen = new Set();

    for (const entry of entries || []) {
        const id = toIdString(entry);
        if (!id) continue;
        if (!validIdSet.has(id)) continue;
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(id);
    }

    return out;
};

// =====================================================
// REAL-TIME ANALYTICS EVENT
// =====================================================

const emitAnalyticsUpdated = (req, reason) => {
    try {
        const io = req.app.get("io");
        if (!io) {
            console.log("Socket.IO instance not available");
            return;
        }
        io.emit("analyticsUpdated", {
            reason,
            timestamp: new Date().toISOString(),
        });
        console.log(`📊 Analytics updated: ${reason}`);
    } catch (error) {
        console.error("Analytics socket error:", error.message);
    }
};

// =====================================================
// GET USER ID
// =====================================================

const getUserId = (req) => {
    if (!req.user) return null;
    if (!req.user.id) return null;
    return String(req.user.id);
};

// =====================================================
// CHECK SEAT AVAILABILITY
// =====================================================

const checkSeatsAvailability = async (showId, selectedSeats) => {
    try {
        const showData = await Show.findById(showId);
        if (!showData) return false;

        const occupiedSeats = showData.occupiedSeats || {};
        const isAnySeatTaken = selectedSeats.some(
            (seat) => occupiedSeats[seat]
        );

        return !isAnySeatTaken;
    } catch (error) {
        console.error("Seat availability error:", error.message);
        return false;
    }
};

// =====================================================
// USER BOOKINGS ARRAY — CANONICAL SYNC HELPER
// -----------------------------------------------------
// Every code path that changes the bookings collection for
// a user should end by calling this. It guarantees:
//   • Only real booking IDs are present
//   • Stored as strings (canonical form)
//   • No duplicates
//   • Nothing is added that shouldn't be there
//
// Returns { before, after, changed } for logging.
// =====================================================

const syncUserBookingsArray = async (userId) => {
    if (!userId) return { before: 0, after: 0, changed: false };

    const realBookings = await Booking.find(
        { user: String(userId) },
        "_id"
    ).lean();
    const validIdSet = new Set(realBookings.map((b) => String(b._id)));

    const user = await User.findById(userId).select("bookings").lean();
    if (!user) return { before: 0, after: 0, changed: false };

    const before = Array.isArray(user.bookings) ? user.bookings : [];
    const after = cleanBookingArray(before, validIdSet);

    const beforeStrs = before.map(toIdString).filter(Boolean);
    const changed =
        beforeStrs.length !== after.length ||
        beforeStrs.some((id, i) => id !== after[i]) ||
        before.some((e) => typeof e !== "string");

    if (changed) {
        await User.findByIdAndUpdate(userId, {
            $set: { bookings: after },
        });
        console.log(
            `🧹 syncUserBookingsArray(${userId}): ${before.length} → ${after.length} entries`
        );
    }

    return { before: before.length, after: after.length, changed };
};

// =====================================================
// DELETE BOOKING HELPER (ROBUST)
//
// Removes booking from EVERY place:
//   1. show.occupiedSeats (frees the seats)
//   2. user.bookings array (pulls the ID)
//   3. bookings collection (deletes the document)
// =====================================================

const deleteBookingAndCleanup = async (booking, userId) => {
    if (!booking) return;

    const ownerId =
        userId != null ? userId : booking.user != null ? booking.user : null;
    const ownerIdStr = toIdString(ownerId);

    // 1. Free seats in show
    try {
        const show = await Show.findById(booking.show);
        if (show && show.occupiedSeats) {
            let changed = false;

            (booking.bookedSeats || []).forEach((seat) => {
                const owner = show.occupiedSeats[seat];
                if (owner && isSameId(owner, ownerIdStr)) {
                    delete show.occupiedSeats[seat];
                    changed = true;
                }
            });

            if (changed) {
                show.markModified("occupiedSeats");
                await show.save();
            }
        }
    } catch (err) {
        console.warn(
            `⚠️  Could not free seats for booking ${booking._id}:`,
            err.message
        );
    }

    // 2. Remove booking reference from user (robust against mixed types)
    if (ownerIdStr) {
        const bookingIdStr = String(booking._id);

        try {
            // First try the atomic $pull with both possible forms
            await User.findByIdAndUpdate(ownerIdStr, {
                $pull: {
                    bookings: { $in: [booking._id, bookingIdStr] },
                },
            });

            // Verify and force-clean if a string form survived
            const userDoc = await User.findById(ownerIdStr)
                .select("bookings")
                .lean();

            if (userDoc && Array.isArray(userDoc.bookings)) {
                const cleaned = userDoc.bookings.filter(
                    (entry) => !isSameId(entry, bookingIdStr)
                );

                if (cleaned.length !== userDoc.bookings.length) {
                    // Normalize remaining entries to strings too
                    const normalized = [
                        ...new Set(cleaned.map(toIdString).filter(Boolean)),
                    ];
                    await User.findByIdAndUpdate(ownerIdStr, {
                        $set: { bookings: normalized },
                    });
                    console.log(
                        `🧹 Force-removed booking ${bookingIdStr} from user ${ownerIdStr} (stored as string).`
                    );
                }
            }
        } catch (err) {
            console.warn(
                `⚠️  Could not clean user.bookings for ${ownerIdStr}:`,
                err.message
            );
        }
    }

    // 3. Delete booking
    try {
        await Booking.findByIdAndDelete(booking._id);
        console.log(
            `✅ Deleted booking ${booking._id} and cleaned up references.`
        );
    } catch (err) {
        console.error(
            `❌ Failed to delete booking ${booking._id}:`,
            err.message
        );
    }
};

// =====================================================
// REPAIR: remove stale booking IDs from every user
// =====================================================

const repairUserBookingsArrays = async () => {
    const allBookings = await Booking.find({}, "_id").lean();
    const validIds = new Set(allBookings.map((b) => String(b._id)));

    const users = await User.find({}, "bookings").lean();

    let changedUsers = 0;
    let removedRefs = 0;
    let normalizedUsers = 0;

    for (const u of users) {
        const current = Array.isArray(u.bookings) ? u.bookings : [];
        const currentStrs = current.map(toIdString).filter(Boolean);
        const cleaned = cleanBookingArray(current, validIds);

        const hasNonString = current.some((e) => typeof e !== "string");
        const lengthChanged = cleaned.length !== current.length;
        const orderChanged = currentStrs.some((id, i) => id !== cleaned[i]);
        const deduped = currentStrs.length !== current.length;

        if (lengthChanged || hasNonString || orderChanged || deduped) {
            removedRefs += current.length - cleaned.length;
            await User.findByIdAndUpdate(u._id, { bookings: cleaned });
            changedUsers++;

            if (hasNonString || deduped) normalizedUsers++;
        }
    }

    console.log(
        `🧹 repairUserBookingsArrays → ${changedUsers} user(s), ${removedRefs} stale ref(s) removed, ${normalizedUsers} normalized/deduped`
    );

    return { changedUsers, removedRefs, normalizedUsers };
};

// =====================================================
// REPAIR: free seats in shows that no longer have a booking
// =====================================================

const repairShowOccupiedSeats = async () => {
    const shows = await Show.find();
    let fixedSeats = 0;
    let changedShows = 0;

    for (const show of shows) {
        const occ = show.occupiedSeats || {};
        const seats = Object.keys(occ);
        if (seats.length === 0) continue;

        let changed = false;

        for (const seat of seats) {
            const ownerId = occ[seat];

            const exists = await Booking.findOne({
                show: String(show._id),
                bookedSeats: seat,
                ...(ownerId ? { user: String(ownerId) } : {}),
            }).lean();

            if (!exists) {
                delete show.occupiedSeats[seat];
                fixedSeats++;
                changed = true;
            }
        }

        if (changed) {
            show.markModified("occupiedSeats");
            await show.save();
            changedShows++;
        }
    }

    console.log(
        `🧹 repairShowOccupiedSeats → ${changedShows} show(s), ${fixedSeats} seat(s) freed`
    );

    return { changedShows, fixedSeats };
};

// =====================================================
// REPAIR DATABASE
// =====================================================

export const repairDatabase = async () => {
    console.log("🛠  Repairing database...");

    const seatReport = await repairShowOccupiedSeats();
    const userReport = await repairUserBookingsArrays();

    await cleanupExpiredBookings();

    console.log("✅ Repair complete.");

    return {
        ...seatReport,
        ...userReport,
    };
};

// =====================================================
// REPAIR DATABASE — HTTP ENDPOINT
// POST /booking/repair
// =====================================================

export const repairDatabaseNow = async (req, res) => {
    try {
        const result = await repairDatabase();
        emitAnalyticsUpdated(req, "database_repaired");

        return res.status(200).json({
            success: true,
            message: "Database repaired.",
            ...result,
        });
    } catch (error) {
        console.error("REPAIR DATABASE ERROR:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Unable to repair database.",
        });
    }
};

// =====================================================
// CREATE BOOKING
// POST /booking/create
// =====================================================

export const createBooking = async (req, res) => {
    try {
        console.log("======================================");
        console.log("CREATE BOOKING REQUEST");
        console.log("Request body:", req.body);

        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User is not authenticated.",
            });
        }

        const { showId, selectedSeats, seatDetails: incomingSeatDetails, theaterId } =
            req.body;

        if (!showId) {
            return res.status(400).json({
                success: false,
                message: "Show ID is required.",
            });
        }

        if (!Array.isArray(selectedSeats) || selectedSeats.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please select at least one seat.",
            });
        }

        const uniqueSeats = [
            ...new Set(selectedSeats.map((seat) => String(seat))),
        ];

        if (uniqueSeats.length > 5) {
            return res.status(400).json({
                success: false,
                message: "You can book a maximum of 5 seats.",
            });
        }

        const showData = await Show.findById(showId).populate("movie");
        if (!showData) {
            return res.status(404).json({
                success: false,
                message: "Show not found.",
            });
        }

        if (!showData.movie) {
            return res.status(404).json({
                success: false,
                message: "Movie for this show was not found.",
            });
        }

        const movie = showData.movie;

        const isAvailable = await checkSeatsAvailability(showId, uniqueSeats);
        if (!isAvailable) {
            return res.status(409).json({
                success: false,
                message: "One or more selected seats are already booked.",
            });
        }

        // ---------------------------------------------
        // BASE PRICE
        // ---------------------------------------------
        const showPrice = Number(showData.showPrice);
        if (!Number.isFinite(showPrice) || showPrice <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid show price.",
            });
        }

        const showDateTime = showData.showDateTime;
        if (!showDateTime) {
            return res.status(400).json({
                success: false,
                message: "Show date and time are not available.",
            });
        }

        // ---------------------------------------------
        // PER-SEAT PRICING
        // ---------------------------------------------
        const normalizedSeatDetails = uniqueSeats.map((seat) => {
            const clientEntry = Array.isArray(incomingSeatDetails)
                ? incomingSeatDetails.find((s) => s.seat === seat)
                : null;

            let type = normalizeSeatType(clientEntry?.type);
            if (!type) type = getSeatTypeByRow(seat);

            const percentage = SEAT_TYPE_PERCENTAGES[type];
            const price = Math.round((showPrice * percentage) / 100);

            return { seat, type, price, percentage };
        });

        const totalAmount = normalizedSeatDetails.reduce(
            (sum, s) => sum + s.price,
            0
        );

        console.log(
            "💰 Per-seat pricing:",
            normalizedSeatDetails,
            "→ total:",
            totalAmount
        );

        // ---------------------------------------------
        // THEATER VALIDATION
        // ---------------------------------------------
        const resolvedTheaterId =
            theaterId || showData.theaterId || null;

        if (!resolvedTheaterId) {
            console.log("❌ Booking rejected: theaterId missing");
            return res.status(400).json({
                success: false,
                message:
                    "Theater is required to book tickets. Please select a theater first.",
            });
        }

        const theaterDoc = await Theater.findById(resolvedTheaterId);
        if (!theaterDoc) {
            console.log(
                "❌ Booking rejected: theater not found —",
                resolvedTheaterId
            );
            return res.status(400).json({
                success: false,
                message:
                    "Selected theater was not found. Please select a valid theater.",
            });
        }

        console.log(
            "✅ Resolved theaterId for booking:",
            resolvedTheaterId,
            "→",
            theaterDoc.name
        );

        // ---------------------------------------------
        // CREATE BOOKING
        // ---------------------------------------------
        const booking = await Booking.create({
            user: userId,
            show: String(showData._id),
            theaterId: resolvedTheaterId,
            movieId: String(movie._id),
            movieName: movie.title || "",
            poster: movie.poster_path || "",
            showDateTime,
            showPrice,
            basePrice: showPrice,
            runtime: Number(movie.runtime) || 0,
            amount: totalAmount,
            bookedSeats: uniqueSeats,
            seatDetails: normalizedSeatDetails,
            isPaid: false,
            paymentLink: "",
            pidx: "",
            transactionId: "",
            paymentMethod: null,
            paymentId: null,
        });

        console.log("🔄 Updating user bookings with booking ID:", booking._id);

        // Use $addToSet with the string form so we never duplicate
        await User.findByIdAndUpdate(userId, {
            $addToSet: { bookings: String(booking._id) },
        });

        console.log("✅ User bookings updated.");

        if (!showData.occupiedSeats) showData.occupiedSeats = {};
        uniqueSeats.forEach((seat) => {
            showData.occupiedSeats[seat] = userId;
        });
        showData.markModified("occupiedSeats");
        await showData.save();

        emitAnalyticsUpdated(req, "booking_created");

        console.log("BOOKING CREATED SUCCESSFULLY");
        console.log("======================================");

        return res.status(201).json({
            success: true,
            message: "Booking successful.",
            booking,
        });
    } catch (error) {
        console.error("CREATE BOOKING ERROR:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create booking.",
        });
    }
};

// =====================================================
// GET OCCUPIED SEATS
// GET /booking/occupied-seats/:showId
// =====================================================

export const getOccupiedSeats = async (req, res) => {
    try {
        const { showId } = req.params;
        if (!showId) {
            return res.status(400).json({
                success: false,
                message: "Show ID is required.",
            });
        }

        const showData = await Show.findById(showId);
        if (!showData) {
            return res.status(404).json({
                success: false,
                message: "Show not found.",
            });
        }

        const cutoff = new Date(Date.now() - RESERVATION_WINDOW_MS);

        const paidBookings = await Booking.find(
            { show: String(showId), isPaid: true },
            "bookedSeats"
        ).lean();

        const heldSeats = new Set();
        paidBookings.forEach((b) => {
            (b.bookedSeats || []).forEach((s) => heldSeats.add(String(s)));
        });

        const freshUnpaid = await Booking.find(
            {
                show: String(showId),
                isPaid: false,
                createdAt: { $gte: cutoff },
            },
            "bookedSeats"
        ).lean();

        freshUnpaid.forEach((b) => {
            (b.bookedSeats || []).forEach((s) => heldSeats.add(String(s)));
        });

        const occ = showData.occupiedSeats || {};
        let changed = false;

        Object.keys(occ).forEach((seat) => {
            if (!heldSeats.has(String(seat))) {
                delete showData.occupiedSeats[seat];
                changed = true;
            }
        });

        if (changed) {
            showData.markModified("occupiedSeats");
            await showData.save();
            console.log(
                `🧹 Freed stale seats for show ${showId} → now held: [${[
                    ...heldSeats,
                ].join(", ")}]`
            );
        }

        return res.status(200).json({
            success: true,
            occupiedSeats: Array.from(heldSeats),
        });
    } catch (error) {
        console.error("GET OCCUPIED SEATS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to get occupied seats.",
        });
    }
};

// =====================================================
// GET MY BOOKINGS
// GET /booking/my
// =====================================================

export const getMyBookings = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User is not authenticated.",
            });
        }

        const allBookings = await Booking.find({ user: userId })
            .populate(
                "theaterId",
                "name city address latitude longitude"
            )
            .sort({ createdAt: -1 });

        const now = new Date();
        const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

        const validBookings = [];

        for (const booking of allBookings) {
            if (booking.isPaid) {
                validBookings.push(booking);
                continue;
            }

            if (booking.createdAt < tenMinutesAgo) {
                await deleteBookingAndCleanup(booking, userId);
            } else {
                validBookings.push(booking);
            }
        }

        // Re-sync the user's bookings array to the truth.
        await syncUserBookingsArray(userId);

        validBookings.sort((a, b) => b.createdAt - a.createdAt);

        return res.status(200).json({
            success: true,
            bookings: validBookings,
        });
    } catch (error) {
        console.error("GET MY BOOKINGS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Unable to get bookings.",
        });
    }
};

// =====================================================
// SYNC USER BOOKINGS ARRAY (self-healing)
// POST /booking/sync-user
// =====================================================

export const syncUserBookingsNow = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User is not authenticated.",
            });
        }

        // 1. Real bookings for this user (as strings)
        const realBookings = await Booking.find(
            { user: userId },
            "_id show bookedSeats"
        ).lean();
        const validIdSet = new Set(realBookings.map((b) => String(b._id)));

        // 2. Read user
        const user = await User.findById(userId).lean();
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        // 3. Clean the array using the shared helper
        const before = Array.isArray(user.bookings) ? user.bookings : [];
        const after = cleanBookingArray(before, validIdSet);
        const removedUserRefs = before.length - after.length;

        const needsUpdate =
            removedUserRefs > 0 ||
            before.length !== after.length ||
            before.some((e) => typeof e !== "string");

        if (needsUpdate) {
            await User.findByIdAndUpdate(userId, {
                $set: { bookings: after },
            });
            console.log(
                `🧹 syncUserBookingsNow(${userId}): ${before.length} → ${after.length}`
            );
        }

        // 4. Free stale occupiedSeats across every show for this user
        const allShows = await Show.find(
            { occupiedSeats: { $exists: true, $ne: {} } },
            "_id occupiedSeats"
        );

        let freedSeats = 0;

        for (const show of allShows) {
            const occ = show.occupiedSeats || {};
            const staleSeats = [];

            for (const [seat, ownerId] of Object.entries(occ)) {
                if (String(ownerId) !== String(userId)) continue;

                const stillBooked = realBookings.some(
                    (b) =>
                        String(b.show) === String(show._id) &&
                        Array.isArray(b.bookedSeats) &&
                        b.bookedSeats.includes(seat)
                );

                if (!stillBooked) staleSeats.push(seat);
            }

            if (staleSeats.length > 0) {
                staleSeats.forEach((s) => delete show.occupiedSeats[s]);
                show.markModified("occupiedSeats");
                await show.save();
                freedSeats += staleSeats.length;
                console.log(
                    `🧹 Show ${show._id}: freed ${staleSeats.length} stale seat(s): ${staleSeats.join(
                        ", "
                    )}`
                );
            }
        }

        return res.status(200).json({
            success: true,
            message: "User bookings synced.",
            totalBookings: realBookings.length,
            removedUserRefs,
            freedSeats,
            bookingIds: [...validIdSet],
        });
    } catch (error) {
        console.error("SYNC USER BOOKINGS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Unable to sync user bookings.",
        });
    }
};

// =====================================================
// GET ALL BOOKINGS (admin)
// GET /booking/all
// =====================================================

export const getAllBookings = async (req, res) => {
    try {
        await cleanupExpiredBookings();

        const bookings = await Booking.find()
            .populate("user", "name email")
            .populate(
                "theaterId",
                "name city address latitude longitude"
            )
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            bookings,
        });
    } catch (error) {
        console.error("GET ALL BOOKINGS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Unable to get all bookings.",
        });
    }
};

// =====================================================
// GET ONE BOOKING
// GET /booking/:bookingId
// =====================================================

export const getBookingById = async (req, res) => {
    try {
        const { bookingId } = req.params;
        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: "Booking ID is required.",
            });
        }

        const booking = await Booking.findById(bookingId)
            .populate("user", "name email")
            .populate(
                "theaterId",
                "name city address latitude longitude"
            );

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found.",
            });
        }

        return res.status(200).json({
            success: true,
            booking,
        });
    } catch (error) {
        console.error("GET BOOKING ERROR:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Unable to get booking.",
        });
    }
};

// =====================================================
// SYNC BOOKING PRICE
// PUT /booking/:id/sync-price
// =====================================================

export const syncBookingPrice = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User is not authenticated.",
            });
        }

        const { id } = req.params;
        const { amount, basePrice, seatDetails } = req.body;

        if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid amount.",
            });
        }

        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found.",
            });
        }

        if (String(booking.user) !== String(userId)) {
            return res.status(403).json({
                success: false,
                message: "Not allowed.",
            });
        }

        if (booking.isPaid) {
            return res.status(400).json({
                success: false,
                message: "Booking already paid.",
            });
        }

        booking.amount = Number(amount);

        if (Number.isFinite(Number(basePrice)) && Number(basePrice) > 0) {
            booking.basePrice = Number(basePrice);
            booking.showPrice = Number(basePrice);
        }

        if (Array.isArray(seatDetails) && seatDetails.length > 0) {
            booking.seatDetails = seatDetails.map((s) => ({
                seat: s.seat,
                type: s.type,
                price: Number(s.price),
                percentage: Number(s.percentage),
            }));
        }

        await booking.save();

        // Ensure the user's array still references this booking
        await User.findByIdAndUpdate(userId, {
            $addToSet: { bookings: String(booking._id) },
        });

        console.log(
            `✅ Synced booking ${id} → amount=${booking.amount}, basePrice=${booking.basePrice}`
        );

        return res.json({ success: true, booking });
    } catch (error) {
        console.error("syncBookingPrice error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to sync booking.",
        });
    }
};

// =====================================================
// PAY BOOKING (Manual payment)
// PUT /booking/pay/:bookingId
// =====================================================

export const payBooking = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User is not authenticated.",
            });
        }

        const { bookingId } = req.params;
        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: "Booking ID is required.",
            });
        }

        const booking = await Booking.findById(bookingId).populate(
            "user",
            "name email"
        );

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found.",
            });
        }

        if (
            String(booking.user._id || booking.user) !== String(userId)
        ) {
            return res.status(403).json({
                success: false,
                message: "You cannot pay for this booking.",
            });
        }

        if (booking.isPaid) {
            return res.status(400).json({
                success: false,
                message: "Booking is already paid.",
            });
        }

        booking.isPaid = true;
        booking.paymentLink = "";
        await booking.save();

        emitAnalyticsUpdated(req, "booking_paid");

        res.status(200).json({
            success: true,
            message: "Payment successful.",
            booking,
        });

        const userEmail = booking.user?.email;
        const userName = booking.user?.name || "Movie Goer";

        if (userEmail) {
            const subject = "🎟️ Payment Confirmed - QuickShow Ticket";

            const populatedBooking = await Booking.findById(booking._id)
                .populate("theaterId", "name city address")
                .lean();

            const theaterDoc = populatedBooking?.theaterId;

            const theaterLine = theaterDoc?.name
                ? `
                    <p><strong>Theater:</strong> ${theaterDoc.name}</p>
                    ${
                        theaterDoc.city || theaterDoc.address
                            ? `<p><strong>Location:</strong> ${[
                                  theaterDoc.city,
                                  theaterDoc.address,
                              ]
                                  .filter(Boolean)
                                  .join(", ")}</p>`
                            : ""
                    }
                `
                : "";

            const htmlMessage = `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
                    <h2 style="color: #e50914; text-align: center;">Payment Successful! 🎬</h2>
                    <p>Hi <strong>${userName}</strong>,</p>
                    <p>Thank you for your payment. Your movie tickets have been fully confirmed and secured.</p>
                    <hr style="border: none; border-top: 1px solid #ddd;" />
                    <p><strong>Movie:</strong> ${booking.movieName}</p>
                    ${theaterLine}
                    <p><strong>Show Time:</strong> ${new Date(
                        booking.showDateTime
                    ).toLocaleString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    })}</p>
                    <p><strong>Seats:</strong> ${booking.bookedSeats.join(", ")}</p>
                    <p><strong>Total Amount Paid:</strong> Rs. ${booking.amount}</p>
                    <hr style="border: none; border-top: 1px solid #ddd;" />
                    <p style="text-align: center; color: #666; font-size: 14px;">Enjoy your movie experience with QuickShow! 🍿</p>
                </div>
            `;

            sendEmail(userEmail, subject, htmlMessage);
        }
    } catch (error) {
        console.error("PAY BOOKING ERROR:", error);

        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                message: error.message || "Payment failed.",
            });
        }
    }
};

// =====================================================
// STRIPE: CREATE CHECKOUT SESSION
// POST /booking/stripe/create-checkout-session/:bookingId
// =====================================================

export const createStripeCheckoutSession = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User is not authenticated.",
            });
        }

        const { bookingId } = req.params;
        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: "Booking ID is required.",
            });
        }

        const booking = await Booking.findById(bookingId).populate(
            "user",
            "name email"
        );

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found.",
            });
        }

        if (String(booking.user._id || booking.user) !== String(userId)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to pay for this booking.",
            });
        }

        if (booking.isPaid) {
            return res.status(400).json({
                success: false,
                message: "This booking has already been paid.",
            });
        }

        const nprAmount = Number(booking.amount);
        if (!Number.isFinite(nprAmount) || nprAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking amount.",
            });
        }

        const amountInPaisa = Math.round(nprAmount * 100);
        if (amountInPaisa < 50) {
            return res.status(400).json({
                success: false,
                message: "Minimum payment amount is 0.50 NPR.",
            });
        }

        const movieName = booking.movieName || "Movie Ticket";
        const seats = booking.bookedSeats?.join(", ") || "Selected seats";

        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],
            customer_email: booking.user?.email || undefined,
            line_items: [
                {
                    price_data: {
                        currency: "npr",
                        product_data: {
                            name: movieName,
                            description: `Seats: ${seats}`,
                        },
                        unit_amount: amountInPaisa,
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                bookingId: booking._id.toString(),
                amountNPR: nprAmount.toString(),
            },
            success_url: `${process.env.CLIENT_URL}/my-booking?payment=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL}/my-booking?payment=cancelled`,
        });

        return res.status(200).json({
            success: true,
            sessionId: session.id,
            payment_url: session.url,
            amount: nprAmount,
            currency: "NPR",
        });
    } catch (error) {
        console.error("STRIPE CREATE SESSION ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create Stripe checkout session.",
            error: error.message,
        });
    }
};

// =====================================================
// STRIPE: VERIFY PAYMENT (for Checkout redirect)
// POST /booking/stripe/verify
// =====================================================

export const verifyStripePayment = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User is not authenticated.",
            });
        }

        const { sessionId } = req.body;
        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: "Stripe session ID is required.",
            });
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Stripe session not found.",
            });
        }

        const bookingId = session.metadata?.bookingId;
        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: "Booking ID missing from Stripe session.",
            });
        }

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found.",
            });
        }

        if (String(booking.user) !== String(userId)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to verify this payment.",
            });
        }

        if (booking.isPaid) {
            return res.status(200).json({
                success: true,
                message: "Booking is already marked as paid.",
                booking,
            });
        }

        if (session.payment_status !== "paid") {
            return res.status(400).json({
                success: false,
                message: "Payment has not been completed.",
                payment_status: session.payment_status,
            });
        }

        if (session.currency?.toLowerCase() !== "npr") {
            return res.status(400).json({
                success: false,
                message: "Invalid payment currency.",
                expected: "npr",
                received: session.currency,
            });
        }

        const expectedAmountInPaisa = Math.round(
            Number(booking.amount) * 100
        );
        const paidAmountInPaisa = Number(session.amount_total);

        if (paidAmountInPaisa !== expectedAmountInPaisa) {
            return res.status(400).json({
                success: false,
                message: "Payment amount does not match booking amount.",
                expected: expectedAmountInPaisa,
                received: paidAmountInPaisa,
            });
        }

        booking.isPaid = true;
        booking.paymentMethod = "Stripe";
        booking.paymentId = session.payment_intent || session.id;
        await booking.save();

        emitAnalyticsUpdated(req, "stripe_payment_completed");

        const user = await User.findById(userId);
        if (user?.email) {
            const subject = "🎟️ Payment Confirmed - QuickShow Ticket";

            const populatedBooking = await Booking.findById(booking._id)
                .populate("theaterId", "name city address")
                .lean();

            const theaterDoc = populatedBooking?.theaterId;

            const theaterLine = theaterDoc?.name
                ? `
                    <p><strong>Theater:</strong> ${theaterDoc.name}</p>
                    ${
                        theaterDoc.city || theaterDoc.address
                            ? `<p><strong>Location:</strong> ${[
                                  theaterDoc.city,
                                  theaterDoc.address,
                              ]
                                  .filter(Boolean)
                                  .join(", ")}</p>`
                            : ""
                    }
                `
                : "";

            const htmlMessage = `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
                    <h2 style="color: #e50914; text-align: center;">Payment Successful! 🎬</h2>
                    <p>Hi <strong>${user.name || "Movie Goer"}</strong>,</p>
                    <p>Thank you for your payment. Your movie tickets have been fully confirmed and secured.</p>
                    <hr style="border: none; border-top: 1px solid #ddd;" />
                    <p><strong>Movie:</strong> ${booking.movieName}</p>
                    ${theaterLine}
                    <p><strong>Show Time:</strong> ${new Date(
                        booking.showDateTime
                    ).toLocaleString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    })}</p>
                    <p><strong>Seats:</strong> ${booking.bookedSeats.join(", ")}</p>
                    <p><strong>Total Amount Paid:</strong> Rs. ${booking.amount}</p>
                    <hr style="border: none; border-top: 1px solid #ddd;" />
                    <p style="text-align: center; color: #666; font-size: 14px;">Enjoy your movie experience with QuickShow! 🍿</p>
                </div>
            `;

            sendEmail(user.email, subject, htmlMessage);
        }

        return res.status(200).json({
            success: true,
            message: "Payment verified successfully.",
            booking,
            amount: booking.amount,
            currency: "NPR",
        });
    } catch (error) {
        console.error("STRIPE VERIFY ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Payment verification failed.",
            error: error.message,
        });
    }
};

// =====================================================
// STRIPE: CREATE PAYMENT INTENT (embedded Elements)
// POST /booking/stripe/create-payment-intent/:bookingId
// =====================================================

export const createStripePaymentIntent = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User is not authenticated.",
            });
        }

        const { bookingId } = req.params;
        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: "Booking ID is required.",
            });
        }

        const booking = await Booking.findById(bookingId).populate(
            "user",
            "name email"
        );

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found.",
            });
        }

        if (String(booking.user._id || booking.user) !== String(userId)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to pay for this booking.",
            });
        }

        if (booking.isPaid) {
            return res.status(400).json({
                success: false,
                message: "Booking is already paid.",
            });
        }

        const nprAmount = Number(booking.amount);
        if (!Number.isFinite(nprAmount) || nprAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking amount.",
            });
        }

        const amountInPaisa = Math.round(nprAmount * 100);
        if (amountInPaisa < 50) {
            return res.status(400).json({
                success: false,
                message: "Minimum amount is 0.50 NPR.",
            });
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInPaisa,
            currency: "npr",
            metadata: {
                bookingId: booking._id.toString(),
                userId: userId,
            },
            automatic_payment_methods: { enabled: true },
        });

        return res.status(200).json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
        });
    } catch (error) {
        console.error("STRIPE PAYMENT INTENT ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create payment intent.",
            error: error.message,
        });
    }
};

// =====================================================
// STRIPE: VERIFY PAYMENT INTENT (embedded Elements)
// POST /booking/stripe/verify-payment-intent
// =====================================================

export const verifyStripePaymentIntent = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User is not authenticated.",
            });
        }

        const { paymentIntentId, bookingId } = req.body;
        if (!paymentIntentId || !bookingId) {
            return res.status(400).json({
                success: false,
                message: "PaymentIntent ID and Booking ID are required.",
            });
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(
            paymentIntentId
        );
        if (!paymentIntent) {
            return res.status(404).json({
                success: false,
                message: "PaymentIntent not found.",
            });
        }

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found.",
            });
        }

        if (String(booking.user) !== String(userId)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to verify this payment.",
            });
        }

        if (booking.isPaid) {
            return res.status(200).json({
                success: true,
                message: "Booking is already marked as paid.",
                booking,
            });
        }

        if (paymentIntent.status !== "succeeded") {
            return res.status(400).json({
                success: false,
                message: "Payment not successful.",
                status: paymentIntent.status,
            });
        }

        if (paymentIntent.currency?.toLowerCase() !== "npr") {
            return res.status(400).json({
                success: false,
                message: "Invalid currency.",
            });
        }

        const expectedAmount = Math.round(Number(booking.amount) * 100);
        if (paymentIntent.amount !== expectedAmount) {
            return res.status(400).json({
                success: false,
                message: "Amount mismatch.",
            });
        }

        booking.isPaid = true;
        booking.paymentMethod = "Stripe (Elements)";
        booking.paymentId = paymentIntent.id;
        await booking.save();

        emitAnalyticsUpdated(req, "stripe_payment_completed");

        const user = await User.findById(userId);
        if (user?.email) {
            const subject = "🎟️ Payment Confirmed - QuickShow Ticket";

            const populatedBooking = await Booking.findById(booking._id)
                .populate("theaterId", "name city address")
                .lean();

            const theaterDoc = populatedBooking?.theaterId;

            const theaterLine = theaterDoc?.name
                ? `
                    <p><strong>Theater:</strong> ${theaterDoc.name}</p>
                    ${
                        theaterDoc.city || theaterDoc.address
                            ? `<p><strong>Location:</strong> ${[
                                  theaterDoc.city,
                                  theaterDoc.address,
                              ]
                                  .filter(Boolean)
                                  .join(", ")}</p>`
                            : ""
                    }
                `
                : "";

            const htmlMessage = `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
                    <h2 style="color: #e50914; text-align: center;">Payment Successful! 🎬</h2>
                    <p>Hi <strong>${user.name || "Movie Goer"}</strong>,</p>
                    <p>Thank you for your payment. Your movie tickets have been fully confirmed and secured.</p>
                    <hr style="border: none; border-top: 1px solid #ddd;" />
                    <p><strong>Movie:</strong> ${booking.movieName}</p>
                    ${theaterLine}
                    <p><strong>Show Time:</strong> ${new Date(
                        booking.showDateTime
                    ).toLocaleString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    })}</p>
                    <p><strong>Seats:</strong> ${booking.bookedSeats.join(", ")}</p>
                    <p><strong>Total Amount Paid:</strong> Rs. ${booking.amount}</p>
                    <hr style="border: none; border-top: 1px solid #ddd;" />
                    <p style="text-align: center; color: #666; font-size: 14px;">Enjoy your movie experience with QuickShow! 🍿</p>
                </div>
            `;

            sendEmail(user.email, subject, htmlMessage);
        }

        return res.status(200).json({
            success: true,
            message: "Payment verified and booking updated.",
            booking,
        });
    } catch (error) {
        console.error("VERIFY PAYMENT INTENT ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Payment verification failed.",
            error: error.message,
        });
    }
};

// =====================================================
// GLOBAL CLEANUP (removes unpaid bookings older than 15 min)
// =====================================================

export const cleanupExpiredBookings = async () => {
    try {
        const now = new Date();
        const tenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

        const expiredBookings = await Booking.find({
            isPaid: false,
            createdAt: { $lt: tenMinutesAgo },
        });

        if (expiredBookings.length === 0) return;

        console.log(
            `🔄 Found ${expiredBookings.length} expired booking(s). Cleaning up...`
        );

        for (const booking of expiredBookings) {
            await deleteBookingAndCleanup(booking, booking.user);
        }

        // After cleaning bookings, reconcile every affected user's array.
        const affectedUserIds = [
            ...new Set(
                expiredBookings
                    .map((b) => toIdString(b.user))
                    .filter(Boolean)
            ),
        ];

        for (const uid of affectedUserIds) {
            try {
                await syncUserBookingsArray(uid);
            } catch (err) {
                console.warn(
                    `⚠️  Post-cleanup sync failed for user ${uid}:`,
                    err.message
                );
            }
        }

        console.log("✅ Global cleanup complete.");
    } catch (error) {
        console.error("❌ Cleanup error:", error);
    }
};

// =====================================================
// CLEANUP ORPHANED BOOKINGS
// -----------------------------------------------------
// Only DELETES bookings whose user document no longer
// exists. Any booking whose user still exists but is
// missing from user.bookings is RESTORED instead.
// =====================================================

export const cleanupOrphanedBookings = async () => {
    try {
        console.log("🧹 Starting orphaned booking cleanup...");

        const allBookings = await Booking.find().lean();
        console.log(`   Total bookings in DB: ${allBookings.length}`);

        const allUsers = await User.find(
            {},
            "bookings email name"
        ).lean();

        const userIds = new Set(allUsers.map((u) => String(u._id)));

        // Build a map userId -> Set<bookingIdString>
        const userBookingMap = new Map();
        for (const user of allUsers) {
            const set = new Set(
                (user.bookings || [])
                    .map(toIdString)
                    .filter(Boolean)
            );
            userBookingMap.set(String(user._id), set);
        }

        // --- Pass 1: delete bookings whose user is gone ---
        const trueOrphans = allBookings.filter((booking) => {
            const userIdStr = toIdString(booking.user);
            return !userIdStr || !userIds.has(userIdStr);
        });

        console.log(
            `   Found ${trueOrphans.length} truly orphaned booking(s) (user gone)`
        );

        let deleted = 0;
        for (const booking of trueOrphans) {
            try {
                await deleteBookingAndCleanup(booking, booking.user);
                deleted++;
            } catch (err) {
                console.error(
                    `   ❌ Failed to delete orphan ${booking._id}:`,
                    err.message
                );
            }
        }

        // --- Pass 2: restore bookings missing from their user's array ---
        let restored = 0;
        for (const booking of allBookings) {
            const userIdStr = toIdString(booking.user);
            if (!userIdStr || !userIds.has(userIdStr)) continue;

            const set = userBookingMap.get(userIdStr);
            const bookingIdStr = String(booking._id);

            if (!set || !set.has(bookingIdStr)) {
                try {
                    await User.findByIdAndUpdate(userIdStr, {
                        $addToSet: { bookings: bookingIdStr },
                    });
                    set?.add(bookingIdStr);
                    restored++;
                } catch (err) {
                    console.error(
                        `   ❌ Failed to restore booking ${bookingIdStr} to user ${userIdStr}:`,
                        err.message
                    );
                }
            }
        }

        console.log(
            `✅ Orphan cleanup complete. Deleted ${deleted} booking(s), restored ${restored} ref(s).`
        );

        return { deleted, restored };
    } catch (error) {
        console.error("❌ Orphan cleanup error:", error);
        return { deleted: 0, restored: 0, error: error.message };
    }
};

// =====================================================
// DELETE ONE BOOKING (with full cascade)
// DELETE /booking/:bookingId
// =====================================================

export const deleteBookingById = async (req, res) => {
    try {
        const { bookingId } = req.params;
        if (!bookingId) {
            return res.status(400).json({
                success: false,
                message: "Booking ID is required.",
            });
        }

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found.",
            });
        }

        const ownerId = toIdString(booking.user);
        await deleteBookingAndCleanup(booking, ownerId);

        // Also reconcile any user who might still be holding a stale ref
        // (handles the case where the booking's user field was already stale).
        if (ownerId) {
            await syncUserBookingsArray(ownerId);
        }

        emitAnalyticsUpdated(req, "booking_deleted");

        return res.status(200).json({
            success: true,
            message: "Booking deleted and references cleaned up.",
            deletedBookingId: bookingId,
        });
    } catch (error) {
        console.error("DELETE BOOKING ERROR:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to delete booking.",
        });
    }
};

// =====================================================
// ONE-SHOT FULL DB RECONCILIATION (admin)
// POST /booking/reconcile
// -----------------------------------------------------
// Runs every repair pass and also re-syncs EVERY user's
// bookings array against the bookings collection. Use
// this once to fix historical drift.
// =====================================================

export const reconcileEverything = async (req, res) => {
    try {
        console.log("🧨 Full database reconciliation starting...");

        const seatReport = await repairShowOccupiedSeats();
        const userReport = await repairUserBookingsArrays();
        const orphanReport = await cleanupOrphanedBookings();

        await cleanupExpiredBookings();

        // Final safety sweep: sync every user's array
        const allUsers = await User.find({}, "_id").lean();
        let syncedUsers = 0;
        for (const u of allUsers) {
            const result = await syncUserBookingsArray(String(u._id));
            if (result.changed) syncedUsers++;
        }

        emitAnalyticsUpdated(req, "database_reconciled");

        console.log("✅ Full reconciliation complete.");

        return res.status(200).json({
            success: true,
            message: "Full reconciliation complete.",
            seatReport,
            userReport,
            orphanReport,
            syncedUsers,
        });
    } catch (error) {
        console.error("RECONCILE ERROR:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Reconciliation failed.",
        });
    }
};