import express from "express";
import OpenAI from "openai";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get("/", (req, res) => {
  res.send("Viernes está vivo y listo para aprender.");
});

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Eres Viernes, un asistente personal inteligente que ayuda a organizar la vida del usuario.",
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    res.json({
      reply: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error en Viernes");
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Viernes está funcionando en el puerto", PORT);
});
