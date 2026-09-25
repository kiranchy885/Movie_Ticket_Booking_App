import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: process.env.EMAIL_SECURE === "true",

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export const sendBookingConfirmationEmail = async ({
    email,
    name,
    movieTitle,
    showDate,
    showTime,
    seats,
    amount,
    bookingId,
}) => {
    try {
        const mailOptions = {
            from: `"Movie Ticket Booking" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "🎟️ Booking Confirmed - Movie Ticket Booking",

            html: `
                <div style="
                    font-family: Arial, sans-serif;
                    max-width: 600px;
                    margin: auto;
                    padding: 20px;
                    border: 1px solid #ddd;
                    border-radius: 10px;
                ">

                    <h2 style="color: #16a34a;">
                        Booking Confirmed!
                    </h2>

                    <p>Hello <strong>${name}</strong>,</p>

                    <p>
                        Your movie ticket booking has been successfully confirmed.
                    </p>

                    <hr>

                    <h3>Booking Details</h3>

                    <p>
                        <strong>Booking ID:</strong> ${bookingId}
                    </p>

                    <p>
                        <strong>Movie:</strong> ${movieTitle}
                    </p>

                    <p>
                        <strong>Date:</strong> ${showDate}
                    </p>

                    <p>
                        <strong>Time:</strong> ${showTime}
                    </p>

                    <p>
                        <strong>Seats:</strong> ${seats.join(", ")}
                    </p>

                    <p>
                        <strong>Total Amount:</strong> Rs. ${amount}
                    </p>

                    <hr>

                    <p style="color: #555;">
                        Please arrive at the movie center a few minutes
                        before the show starts.
                    </p>

                    <p>
                        Thank you for booking with us!
                    </p>

                </div>
            `,
        };

        await transporter.sendMail(mailOptions);

        console.log("Booking confirmation email sent to:", email);

        return {
            success: true,
        };

    } catch (error) {
        console.error("Email sending error:", error);

        return {
            success: false,
            error: error.message,
        };
    }
};