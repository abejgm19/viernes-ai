const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Groq = require('groq-sdk');
const express = require('express');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Configuración para que funcione en Railway
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        handleSIGTERM: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Esto mostrará el QR en los Logs de Railway para que lo escanees
client.on('qr', (qr) => {
    console.log('--- IZUMI, ESCANEA ESTE CÓDIGO CON TU WHATSAPP ---');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('¡Viernes está conectado a WhatsApp y listo!');
});

// Responder mensajes de WhatsApp
client.on('message', async (msg) => {
    if (!msg.from.includes('@g.us')) { // No responde en grupos
        try {
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: "Eres Viernes, el asistente personal de Izumi. Eres inteligente y directo." },
                    { role: "user", content: msg.body }
                ],
                // Usamos el nuevo modelo porque el anterior fue retirado
                model: "llama-3.3-70b-versatile", 
            });
            msg.reply(chatCompletion.choices[0].message.content);
        } catch (error) {
            console.error("Error en la IA:", error.message);
        }
    }
});

client.initialize();

// Página de confirmación web
app.get('/', (req, res) => {
    res.send('<h1>Viernes está activo. Revisa los logs de Railway para el QR.</h1>');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
