const express = require('express');
const Groq = require('groq-sdk');
const dotenv = require('dotenv');
const cors = require('cors');

// Cargar variables de entorno (.env)
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Configuración de Groq con tu API KEY de Railway
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// 1. RUTA PRINCIPAL (Para ver en el navegador)
// Esto evita el error "Cannot GET /"
app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
            <h1>🤖 ¡Viernes está Vivo!</h1>
            <p>El servidor en Railway está funcionando correctamente, Izumi.</p>
            <p style="color: green;">Listo para recibir mensajes desde Hoppscotch o WhatsApp.</p>
        </div>
    `);
});

// 2. RUTA DE CHAT (Para Hoppscotch)
app.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: "No enviaste ningún mensaje." });
        }

        // Llamada a la IA con el NUEVO modelo actualizado
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "Eres Viernes, el asistente personal inteligente y leal de Izumi. Responde de forma breve y eficiente." },
                { role: "user", content: message }
            ],
            // Se cambió el modelo porque el anterior fue desactivado por Groq
            model: "llama-3.3-70b-versatile", 
        });

        // Enviar la respuesta de la IA de vuelta
        res.json({ 
            response: chatCompletion.choices[0].message.content 
        });

    } catch (error) {
        console.error("DETALLE DEL ERROR:", error.message);
        res.status(500).json({ 
            error: "Fallo en la conexión con la IA",
            detalles: error.message 
        });
    }
});

// Configuración del puerto para Railway
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Viernes escuchando en el puerto ${PORT}`);
});
