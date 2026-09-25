import nodemailer from "nodemailer";

export const sendEmail = async (to, subject, htmlContent) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: `"QuickShow" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html: htmlContent,
        };

        await transporter.sendMail(mailOptions);
        console.log("Email sent successfully to:", to);
    } catch (error) {
        console.error("Error sending email:", error);
    }
};

// NEW: Newsletter Subscription Controller
export const handleNewsletterSubscription = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: "Email address is required." });
        }

        const subject = "Welcome to QuickShow! 🎉 Subscription Confirmed";
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eaeaea; border-radius: 10px; background-color: #f9f9f9;">
                <h2 style="color: #e50914; margin-top: 0;">Welcome to QuickShow!</h2>
                <p>Thank you for subscribing to our newsletter. You're now on our VIP list to receive exclusive movie trailers, premier showtimes, and special promo codes right in your inbox.</p>
                <div style="background: #ffffff; padding: 15px; border-radius: 8px; border: 1px solid #e0e0e0; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0; font-weight: bold; color: #111;">Need Booking Consultations?</p>
                    <p style="margin: 0 0 5px 0;">📧 Email: <a href="mailto:deeptiparajuli4@gmail.com" style="color: #e50914;">deeptiparajuli4@gmail.com</a></p>
                    <p style="margin: 0;">📞 Mobile No: <strong>9841368745</strong> (Faster contact)</p>
                </div>
                <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
                <p style="font-size: 12px; color: #777; margin-bottom: 0;">Happy watching!<br/><strong>The QuickShow Team</strong></p>
            </div>
        `;

        // Calls your existing sendEmail function securely
        await sendEmail(email, subject, htmlContent);

        return res.status(200).json({ 
            success: true, 
            message: "Thank-you email sent successfully to your mailbox!" 
        });
    } catch (error) {
        console.error("Subscription email controller error:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Failed to dispatch subscription email." 
        });
    }
};