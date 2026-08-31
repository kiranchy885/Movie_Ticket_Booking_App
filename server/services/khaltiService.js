import axios from "axios";

const KHALTI_BASE_URL = 
    process.env.KHALTI_BASE_URL ||
    "https://dev.khalti.com/api/v2";

    const getHeaders = () => ({
        Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
        "Content-Type": "application/json",
    });

    // Initiate Khalti Payment
    export const initiateKhaltiPayment = async ({
        amount,
        purchaseOrderId,
        purchaseOrderName,
        customer,
    }) => {
        const response = await axios.post(
            `${KHALTI_BASE_URL}/epayment/initiate/`,
            {
                return_url: process.env.CLIENT_URL,

                // Khalti requires paisa
                amount: Math.round(amount * 100),

                purchase_oder_id: purchaseOrderId,
                purchase_order_name: purchaseOrderName,

                customer_info: {
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone || "9800000000",
                },
            },
            {
                headers: getHeaders(),
            }
        );

        return response.data;
    };

    // Verify payment using pidx
    export const lookupKhaltiPayment = async (pidx) => {
  const response = await axios.post(
    `${KHALTI_BASE_URL}/epayment/lookup/`,
    {
      pidx,
    },
    {
      headers: getHeaders(),
    }
  );

  return response.data;
};