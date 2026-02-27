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
    console.log('--- SISTEMA LISTO ---');
    console.log('Viernes está esperando mensajes...');
    isReady = true; 
});

// 🧠 FUNCIÓN PARA GUARDAR EN EXCEL (CON LOGS DE ERROR DETALLADOS)
async function guardarEnExcel(mensaje, respuesta) {
    try {
        const fecha = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'A:C', 
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[fecha, mensaje, respuesta]] }
        });
        console.log("✅ ¡Dato guardado en Excel exitosamente!");
    } catch (error) {
        console.error("❌ ERROR CRÍTICO DE EXCEL:", error.message);
    }
}

client.on('message_create', async (msg) => {
    // 🔍 EL SENSOR: Copia lo que salga aquí en los logs de Railway
    console.log(`[RASTRADORE] Mensaje de: ${msg.from} | Para: ${msg.to} | ID: ${msg.id.remote}`);

    // Si tú le escribes a Viernes o te escribes a ti mismo, esto debería activarse
    if (!msg.body.startsWith('🤖') && !msg.hasMedia) {
        try {
            console.log(`Procesando mensaje de Abel: ${msg.body}`);
            
            const chatCompletion = await groq.chat.completions.create({
                messages: [{ role: "system", content: "Eres Viernes, asistente de Abel. Usa emojis." }, { role: "user", content: msg.body }],
                model: "llama-3.3-70b-versatile",
            });
            
            const respuestaViernes = chatCompletion.choices[0].message.content;
            
            // Intentar responder
            await client.sendMessage(msg.from, '🤖\n' + respuestaViernes);
            console.log("✅ Respuesta enviada a WhatsApp");

            // Guardar en Excel
            await guardarEnExcel(msg.body, respuestaViernes);
            
        } catch (error) {
            console.error("❌ ERROR EN PROCESAMIENTO:", error.message);
        }
    }
});

client.initialize();

app.get('/', (req, res) => {
    if (isReady) res.send("<h1>Viernes v3.2 ONLINE</h1>");
    else if (qrImageUrl) res.send(`<img src="${qrImageUrl}">`);
    else res.send("<h1>Cargando...</h1>");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Puerto ${PORT}`));
