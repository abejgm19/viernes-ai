const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode'); 
const Groq = require('groq-sdk');
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

let qrImageUrl = ''; 
let isReady = false;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        handleSIGTERM: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', async (qr) => {
    console.log('Nuevo QR generado. Entra a la web para verlo.');
    qrImageUrl = await qrcode.toDataURL(qr); 
});

client.on('ready', () => {
    console.log('¡Viernes está conectado a WhatsApp!');
    isReady = true;
});

client.on('message_create', async (msg) => {
    // Seguridad extra para evitar errores si WhatsApp no carga rápido
    if (!client.info || !client.info.wid) return; 
    
    // LA SOLUCIÓN: Limpiamos tu número para quitar el ID de dispositivo que WhatsApp añade
    const miNumero = client.info.wid.user + '@c.us';

    // Ahora sí coincidirán perfectamente los números
    if (msg.from === miNumero && msg.to === miNumero && !msg.body.startsWith('🤖')) {
        try {
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: "Eres Viernes, el asistente personal de Abel. Eres inteligente, leal y directo. Nunca asistes a nadie más que a él." },
                    { role: "user", content: msg.body }
                ],
                model: "llama-3.3-70b-versatile",
            });
            
            msg.reply('🤖 ' + chatCompletion.choices[0].message.content);
        } catch (error) {
            console.error("Error en Groq:", error.message);
        }
    }
});

client.initialize();

app.get('/', (req, res) => {
    if (isReady) {
        res.send(`
            <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
                <h1 style="color: green;">✅ ¡Viernes está activo y es privado!</h1>
                <p>Abre el chat contigo mismo en WhatsApp para hablar con él.</p>
            </div>
        `);
    } else if (qrImageUrl) {
        res.send(`
            <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
                <h1>🤖 Escanea este código para despertar a Viernes</h1>
                <img src="${qrImageUrl}" alt="Código QR" style="width: 300px; height: 300px; border: 2px solid black; padding: 10px; border-radius: 10px;">
            </div>
        `);
    } else {
        res.send(`
            <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
                <h1>⏳ Generando el código QR...</h1>
            </div>
        `);
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Servidor web en puerto ${PORT}`));
