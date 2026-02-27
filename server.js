const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Groq = require('groq-sdk');
const express = require('express');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Configuración del cliente de WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        handleSIGTERM: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Generar el código QR en los logs de Railway
client.on('qr', (qr) => {
    console.log('--- ESCANEA ESTE CÓDIGO CON WHATSAPP ---');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('¡Viernes está en línea en WhatsApp!');
});

// Lógica de respuesta automática
client.on('message', async (msg) => {
    // Evita responder en grupos para mayor privacidad
    if (!msg.from.includes('@g.us')) {
        try {
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: "Eres Viernes, el asistente personal de Izumi. Eres inteligente, leal y eficiente." },
                    { role: "user", content: msg.body }
                ],
                model: "llama-3.3-70b-versatile",
            });
            msg.reply(chatCompletion.choices[0].message.content);
        } catch (error) {
            console.error("Error en Groq:", error.message);
        }
    }
});

client.initialize();

// Mantener la web viva
app.get('/', (req, res) => res.send('<h1>Viernes está conectado a WhatsApp</h1>'));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));
