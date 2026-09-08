import dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config({
    path: "./.env",
});

console.log(
    "Stripe key loaded:",
    !!process.env.STRIPE_SECRET_KEY
);

if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
        "STRIPE_SECRET_KEY is missing. Check server/.env"
    );
}

const stripe = new Stripe(
    process.env.STRIPE_SECRET_KEY
);

export default stripe;