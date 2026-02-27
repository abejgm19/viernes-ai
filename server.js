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

// 🔐 CONEXIÓN A GOOGLE SHEETS (VERSIÓN DEFINITIVA)
const privateKeyOriginal = process.env.GOOGLE_PRIVATE_KEY || '';
// Esta línea limpia comillas, espacios y arregla los saltos de línea \n de todas las formas posibles
const formattedKey = privateKeyOriginal
    .replace(/^"(.*)"$/, '$1') 
    .replace(/\\n/g, '\n')
    .replace(/\n/g, '\n');

const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: formattedKey,
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
    console.log('¡Viernes despertó! Conexión activa.'); 
    isReady = true; 
});

async function guardarEnExcel(mensaje, respuesta) {
    try {
        const fecha = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Sheet1!A:C', 
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[fecha, mensaje, respuesta]] }
        });
        console.log("✅ Fila guardada en el Excel.");
    } catch (error) {
        console.error("❌ ERROR DE EXCEL EN LOGS:", error.message);
    }
}

client.on('message_create', async (msg) => {
    // Escucha cualquier mensaje que no sea un sticker o audio
    if (!msg.body.startsWith('🤖') && !msg.hasMedia && msg.body.length > 0) {
        try {
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: "Eres Viernes, el asistente de Abel." },
                    { role: "user", content: msg.body }
                ],
                model: "llama-3.3-70b-versatile",
            });
            
            const respuestaViernes = chatCompletion.choices[0].message.content;
            await client.sendMessage(msg.from, '🤖\n' + respuestaViernes);
            
            // Guardar en la base de datos
            await guardarEnExcel(msg.body, respuestaViernes);
            
        } catch (error) {
            console.error("❌ Error procesando mensaje:", error.message);
        }
    }
});

client.initialize();

app.get('/', (req, res) => {
    if (isReady) res.send("<h1>Viernes v3.5 ONLINE</h1>");
    else if (qrImageUrl) res.send(`<img src="${qrImageUrl}" style="width:300px;">`);
    else res.send("<h1>Cargando...</h1>");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Puerto ${PORT}`));
