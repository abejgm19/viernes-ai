const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode'); 
const Groq = require('groq-sdk');
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { google } = require('googleapis');

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// 🔐 CONEXIÓN A GOOGLE SHEETS
const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const sheets = google.sheets({ version: 'v4', auth });
const spreadsheetId = process.env.SPREADSHEET_ID;

let qrImageUrl = ''; 
let isReady = false;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { handleSIGTERM: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

client.on('qr', async (qr) => { qrImageUrl = await qrcode.toDataURL(qr); });

client.on('ready', () => { 
    console.log('¡Viernes está conectado y listo para la prueba!'); 
    isReady = true; 
});

// --- AQUÍ ESTÁ EL CAMBIO IMPORTANTE: EL DETECTOR DE EMERGENCIA ---
client.on('message_create', async (msg) => {
    // 🔍 SENSOR: Esto imprimirá en Railway quién manda el mensaje
    console.log(`LOG DE EMERGENCIA: Recibido de ${msg.from} para ${msg.to}. Cuerpo: ${msg.body}`);

    // Solo respondemos si NO es un mensaje que nosotros mismos enviamos (evita bucles)
    if (!msg.body.startsWith('🤖') && !msg.hasMedia) {
        try {
            console.log("Procesando mensaje de prueba...");
            
            // 1. Intentamos responder directamente a quien sea que escriba
            await client.sendMessage(msg.from, "🤖 ¡Te escucho fuerte y claro! Intentando guardar en Excel...");
            
            // 2. Intentamos escribir en el Excel
            const fecha = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: 'A:C',
                valueInputOption: 'USER_ENTERED',
                resource: { values: [[fecha, msg.body, "Prueba de emergencia exitosa"]] }
            });
            console.log("✅ Escrito en Excel correctamente");

        } catch (error) {
            console.error("❌ Error en el proceso:", error.message);
        }
    }
});

client.initialize();

app.get('/', (req, res) => {
    if (isReady) res.send("<h1>Viernes ONLINE (Modo Emergencia)</h1>");
    else if (qrImageUrl) res.send(`<img src="${qrImageUrl}">`);
    else res.send("<h1>Cargando...</h1>");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Puerto ${PORT}`));
