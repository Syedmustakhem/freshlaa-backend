const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getAIResponse(message, userContext = {}) {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are Freshlaa AI assistant.

You help users with:
- orders
- deals
- payments
- recommendations

Be short, helpful, and friendly.
Use Hinglish when possible.
          `,
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    return response.choices[0].message.content;
  } catch (err) {
    console.log("AI ERROR:", err.message);
    return null;
  }
}

module.exports = { getAIResponse };