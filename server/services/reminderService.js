import cron from "node-cron";
import Booking from "../models/Booking.js";
import { sendEmail } from "../utils/sendEmail.js";

// CONFIG

const MIN_HOURS = 2;
const MAX_HOURS = 3;

// THEATER INFO

const buildTheaterLine = (theater) => {
    if (!theater?.name) return "";

    const location = [theater.city, theater.address]
        .filter(Boolean)
        .join(", ");

    return `
        <p><strong>Theater:</strong> ${theater.name}</p>
        ${
            location
                ? `<p><strong>Location:</strong> ${location}</p>`
                : ""
        }
    `;
};

// SHOW TIME FORMAT

const formatShowTime = (date) => {
    return new Date(date).toLocaleString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

// TIME REMAINING

const getTimeUntilShow = (showDateTime) => {
    const now = new Date();

    const diffMs = new Date(showDateTime) - now;
    const diffMins = Math.round(diffMs / (1000 * 60));

    if (diffMins < 60) {
        return `in ${diffMins} minutes`;
    }

    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (mins === 0) {
        return `in ${hours} hour${hours > 1 ? "s" : ""}`;
    }

    return `in ${hours}h ${mins}m`;
};

// MAIN REMINDER FUNCTION

export const sendUpcomingReminders = async () => {
    try {
        const now = new Date();

        const from = new Date(
            now.getTime() +
                MIN_HOURS * 60 * 60 * 1000
        );

        const to = new Date(
            now.getTime() +
                MAX_HOURS * 60 * 60 * 1000
        );

        console.log(
            `⏰ Checking reminders — show between ${MIN_HOURS}h and ${MAX_HOURS}h from now`
        );

        console.log(
            `   Time range: ${from.toLocaleTimeString()} → ${to.toLocaleTimeString()}`
        );

        // FIND ELIGIBLE BOOKINGS

        const bookings = await Booking.find({
            isPaid: true,

            reminderSent: {
                $ne: true,
            },

            showDateTime: {
                $gte: from,
                $lt: to,
            },

            $expr: {
                $gte: [
                    {
                        $subtract: [
                            "$showDateTime",
                            "$createdAt",
                        ],
                    },
                    MIN_HOURS *
                        60 *
                        60 *
                        1000,
                ],
            },
        })
            .populate("user", "name email")
            .populate(
                "theaterId",
                "name city address"
            )
            .lean();

        console.log(
            `   Found ${bookings.length} booking(s)`
        );

        // SKIP BOOKINGS MADE LESS THAN 2 HOURS BEFORE SHOW

        const skipped = await Booking.find({
            isPaid: true,

            reminderSent: {
                $ne: true,
            },

            showDateTime: {
                $gte: from,
                $lt: to,
            },

            $expr: {
                $lt: [
                    {
                        $subtract: [
                            "$showDateTime",
                            "$createdAt",
                        ],
                    },
                    MIN_HOURS *
                        60 *
                        60 *
                        1000,
                ],
            },
        }).lean();

        if (skipped.length > 0) {
            console.log(
                `   ⏭️ Skipped ${skipped.length} booking(s) — booked too close to show time`
            );

            for (const booking of skipped) {
                await Booking.updateOne(
                    {
                        _id: booking._id,
                    },
                    {
                        $set: {
                            reminderSent: true,
                            reminderSentAt: null,
                        },
                    }
                );
            }
        }

        if (bookings.length === 0) {
            console.log(
                "   No reminders to send."
            );

            return;
        }

        // =====================================================
        // SEND EMAILS
        // =====================================================

        for (const booking of bookings) {
            try {
                const email =
                    booking.user?.email;

                const name =
                    booking.user?.name ||
                    "Movie Goer";

                if (!email) {
                    console.log(
                        `   ⚠️ No email for booking ${booking._id}`
                    );

                    continue;
                }

                const theaterLine =
                    buildTheaterLine(
                        booking.theaterId
                    );

                const timeUntil =
                    getTimeUntilShow(
                        booking.showDateTime
                    );

                const subject =
                    `⏰ Reminder: "${booking.movieName}" starts ${timeUntil}`;

                const seats = Array.isArray(
                    booking.bookedSeats
                )
                    ? booking.bookedSeats.join(", ")
                    : "Not available";

                const htmlMessage = `
                    <div style="
                        font-family: Arial, sans-serif;
                        padding: 20px;
                        color: #333;
                        max-width: 600px;
                        margin: auto;
                        border: 1px solid #ddd;
                        border-radius: 8px;
                        background-color: #f9f9f9;
                    ">

                        <h2 style="
                            color: #e50914;
                            text-align: center;
                        ">
                            Your Show Starts Soon! ⏰
                        </h2>

                        <p>
                            Hi <strong>${name}</strong>,
                        </p>

                        <p>
                            तपाईंको movie
                            <strong>${booking.movieName}</strong>
                            <strong>${timeUntil}</strong>
                            सुरु हुँदैछ।
                        </p>

                        <hr style="
                            border: none;
                            border-top: 1px solid #ddd;
                        " />

                        <p>
                            <strong>Movie:</strong>
                            ${booking.movieName}
                        </p>

                        ${theaterLine}

                        <p>
                            <strong>Show Time:</strong>
                            ${formatShowTime(
                                booking.showDateTime
                            )}
                        </p>

                        <p>
                            <strong>Seats:</strong>
                            ${seats}
                        </p>

                        <hr style="
                            border: none;
                            border-top: 1px solid #ddd;
                        " />

                        <p style="
                            text-align: center;
                            color: #666;
                            font-size: 14px;
                        ">
                            Please arrive at least
                            15 minutes early. 🍿
                            <br />
                            Enjoy the show with QuickShow!
                        </p>

                    </div>
                `;

                await sendEmail(
                    email,
                    subject,
                    htmlMessage
                );

                await Booking.updateOne(
                    {
                        _id: booking._id,
                    },
                    {
                        $set: {
                            reminderSent: true,
                            reminderSentAt:
                                new Date(),
                        },
                    }
                );

                console.log(
                    `   ✅ Reminder sent to ${email} — "${booking.movieName}" ${timeUntil}`
                );
            } catch (error) {
                console.error(
                    `   ❌ Failed for booking ${booking._id}:`,
                    error.message
                );
            }
        }
    } catch (error) {
        console.error(
            "REMINDER ERROR:",
            error
        );
    }
};

// =====================================================
// START CRON SCHEDULER
// =====================================================

let schedulerStarted = false;

export const startReminderScheduler = () => {
    if (schedulerStarted) {
        console.log(
            "⚠️ Reminder scheduler already running."
        );

        return;
    }

    schedulerStarted = true;

    console.log(
        "📅 Reminder scheduler started — checks every 30 minutes"
    );

    console.log(
        `📬 Sends reminder ${MIN_HOURS}-${MAX_HOURS}h before show`
    );

    console.log(
        `⏭️ Skips bookings made less than ${MIN_HOURS}h before show`
    );

    // -------------------------------------------------
    // Run once immediately when server starts
    // -------------------------------------------------

    sendUpcomingReminders();

    // -------------------------------------------------
    // Then run every 30 minutes
    // -------------------------------------------------

    cron.schedule(
        "*/30 * * * *",
        async () => {
            console.log(
                "⏰ Scheduled reminder check started..."
            );

            await sendUpcomingReminders();
        }
    );
};