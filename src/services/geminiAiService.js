import { GoogleGenerativeAI } from "@google/generative-ai";
import config from "../config/env.js";

const geminiAiService = async (message) => {
  // Inicializar cliente Gemini
  const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-3-pro-preview",
    contents: "Comportarte como un veterinario, responde lo más simple posible en texto plano, como si fuera WhatsApp. No saludes ni generes conversación, solo responde a la pregunta.",
  });
  try {
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: message }]
        }
      ]
    });

    const result = await chat.sendMessage(message);
    return result.response.text();
  } catch (error) {
    console.error(error);
  }
};

export default geminiAiService;
