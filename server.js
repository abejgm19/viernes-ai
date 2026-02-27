const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode'); // Nueva librería para imágenes
const Groq = require('groq-sdk');
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

let qrImageUrl = ''; // Aquí guardaremos la foto del QR
let isReady = false;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        handleSIGTERM: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Cuando WhatsApp pida el QR, lo convertimos a foto
client.on('qr', async (qr) => {
    console.log('Nuevo QR generado. Entra a la web para verlo.');
    qrImageUrl = await qrcode.toDataURL(qr); // Crea la imagen
});

client.on('ready', () => {
    console.log('¡Viernes está conectado a WhatsApp!');
    isReady = true;
});

client.on('message', async (msg) => {
    if (!msg.from.includes('@g.us')) {
        try {
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: "Eres Viernes, el asistente personal de Izumi. Eres inteligente y directo." },
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

// LA MAGIA: Tu página web ahora mostrará la foto del QR
app.get('/', (req, res) => {
    if (isReady) {
        res.send(`
            <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
                <h1 style="color: green;">✅ ¡Viernes está conectado a WhatsApp!</h1>
                <p>Ya puedes enviarle mensajes desde tu celular.</p>
            </div>
        `);
    } else if (qrImageUrl) {
        res.send(`
            <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
                <h1>🤖 Escanea este código para despertar a Viernes</h1>
                <p>Abre WhatsApp en tu celular > Dispositivos vinculados > Vincular dispositivo</p>
                <img src="${qrImageUrl}" alt="Código QR" style="width: 300px; height: 300px; border: 2px solid black; padding: 10px; border-radius: 10px;">
                <p style="color: gray;"><i>Si no funciona a la primera, refresca esta página para cargar un código nuevo.</i></p>
            </div>
        `);
    } else {
        res.send(`
            <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
                <h1>⏳ Generando el código QR...</h1>
                <p>Por favor, espera unos 15 segundos y <b>refresca esta página</b>.</p>
            </div>
        `);
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Servidor web en puerto ${PORT}`));
