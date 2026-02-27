const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode'); 
const Groq = require('groq-sdk');
const express = require('express');
const dotenv = require('dotenv');
const { google } = require('googleapis');

dotenv.config();
const app = express();
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// 🔐 CONEXIÓN A GOOGLE SHEETS (Súper Reforzada)
const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        // Este comando limpia cualquier error de formato en la llave privada
        private_key: process.env.GOOGLE_PRIVATE_KEY 
            ? process.env.GOOGLE_PRIVATE_KEY.split(String.raw`\n`).join('\n').replace(/\\n/g, '\n') 
            : '',
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const sheets = google.sheets({ version: 'v4', auth });
const spreadsheetId = process.env.SPREADSHEET_ID;

let qrImageUrl = ''; 
let isReady = false;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        handleSIGTERM: false, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    }
});

client.on('qr', async (qr) => { qrImageUrl = await qrcode.toDataURL(qr); });

client.on('ready', () => { 
    console.log('--- VIERNES ESTÁ DESPIERTO Y CONECTADO ---'); 
    isReady = true; 
});

// 🧠 FUNCIÓN PARA ESCRIBIR EN EXCEL
async function guardarEnExcel(mensaje, respuesta) {
    try {
        const fecha = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Sheet1!A:C', // Escribe en la pestaña Sheet1
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[fecha, mensaje, respuesta]] }
        });
        console.log("✅ ÉXITO: Fila añadida al Excel.");
    } catch (error) {
        console.error("❌ ERROR DE EXCEL:", error.message);
    }
}

client.on('message_create', async (msg) => {
    // REGISTRO DE ACTIVIDAD: Veremos esto en los logs de Railway
    console.log(`[MENSAJE] De: ${msg.from} | Texto: ${msg.body}`);

    // Solo respondemos si no es un mensaje de sistema o sticker
    if (!msg.body.startsWith('🤖') && !msg.hasMedia && msg.body.length > 0) {
        try {
            console.log("Generando respuesta con Groq...");
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: "Eres Viernes, el asistente de Abel. Responde de forma ejecutiva." },
                    { role: "user", content: msg.body }
                ],
                model: "llama-3.3-70b-versatile",
            });
            
            const respuestaViernes = chatCompletion.choices[0].message.content;
            
            // Responder en WhatsApp
            await client.sendMessage(msg.from, '🤖\n' + respuestaViernes);
            console.log("✅ Mensaje enviado a WhatsApp");

            // Guardar en la base de datos
            await guardarEnExcel(msg.body, respuestaViernes);
            
        } catch (error) {
            console.error("❌ ERROR EN EL PROCESO:", error.message);
        }
    }
});

client.initialize();

app.get('/', (req, res) => {
    if (isReady) res.send("<h1>Viernes v3.4 ONLINE</h1>");
    else if (qrImageUrl) res.send(`<img src="${qrImageUrl}" style="width:300px;">`);
    else res.send("<h1>Cargando sistema de Abel...</h1>");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));
