console.log(
  "ENV KEY:",
  import.meta.env.VITE_GEMINI_API_KEY
);
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
console.log(import.meta.env.VITE_GEMINI_API_KEY);
export async function generateAIResponse(prompt) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    console.log("Gemini Response:", data);

    if (data.error) {
      return data.error.message;
    }

    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response"
    );

  } catch (error) {
    console.error(error);

    return "Something went wrong";
  }
} 