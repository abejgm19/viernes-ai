const express = require('express');
const Groq = require('groq-sdk');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Configuración de Groq
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// Ruta principal para verificar que el servidor vive
app.get('/', (req, res) => {
    res.send('Hola Izumi, el servidor de Viernes está en línea y funcionando.');
});

// Ruta para que Viernes "piense" y responda
app.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "Eres Viernes, el asistente personal inteligente de Izumi. Eres eficiente, leal y directo." },
                { role: "user", content: message }
            ],
            model: "llama3-8b-8192", // Un modelo rápido y potente
        });

        res.json({ response: chatCompletion.choices[0].message.content });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Hubo un error en el pensamiento de Viernes." });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Viernes escuchando en el puerto ${PORT}`);
});
