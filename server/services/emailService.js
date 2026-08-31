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
    movie,
    showDateTime,
    seats,
    amount,
    bookingId,
    transactionId,
}) => {


    const formattedDate = new Date(
        showDateTime
    ).toLocaleDateString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

    const mailOptions = {
        from:
        process.env.EMAIL_FROM ||
        process.env.EMAIL_USER,

        to: email,

        subject: "Movie Ticket Booking Confirmed",

        html: `
      <div style="
        font-family: Arial, sans-serif;
        max-width: 600px;
        margin: auto;
        padding: 30px;
        background: #111;
        color: white;
        border-radius: 10px;
      ">

        <h1 style="color:#f43f5e;">
          🎬 Booking Confirmed
        </h1>

        <p>Hello ${name},</p>

        <p>
          Your movie ticket has been successfully booked.
        </p>

        <hr />

        <h2>${movie}</h2>

        <p>
          <strong>Date:</strong>
          ${formattedDate}
        </p>

        <p>
          <strong>Time:</strong>
          ${formattedTime}
        </p>

        <p>
          <strong>Seats:</strong>
          ${seats.join(", ")}
        </p>

        <p>
          <strong>Amount:</strong>
          Rs. ${amount}
        </p>

        <p>
          <strong>Booking ID:</strong>
          ${bookingId}
        </p>

        <p>
          <strong>Transaction ID:</strong>
          ${transactionId || "N/A"}
        </p>

        <p style="color:#4ade80;">
          Payment Status: SUCCESS
        </p>

        <hr />

        <p>
          Thank you for booking with Movie Ticket Booking App.
        </p>

      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
    