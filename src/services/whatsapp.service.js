const axios = require("axios");

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_ID;

const sendWhatsAppTemplate = async (to, templateName, params = []) => {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en_US" },
          components: [
            {
              type: "body",
              parameters: params.map((p) => ({
                type: "text",
                text: String(p),
              })),
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "❌ WhatsApp Send Error:",
      error.response?.data || error.message
    );
    return null;
  }
};

module.exports = { sendWhatsAppTemplate };
