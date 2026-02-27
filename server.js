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

// 🔐 CONEXIÓN A GOOGLE SHEETS (CON PARCHE PARA EL ERROR 1E08010C)
const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        // Limpiamos la llave de comillas extra y restauramos los saltos de línea (\n)
        private_key: process.env.GOOGLE_PRIVATE_KEY 
            ? process.env.GOOGLE_PRIVATE_KEY.replace(/^"(.*)"$/, '$1').replace(/\\n/g, '\n') 
            : '',
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const sheets = google.sheets({ version: 'v4', auth });
const spreadsheetId = process.env.SPREADSHEET_ID;

let qrImageUrl = ''; 
let isReady = false;

// 🧠 EL CEREBRO DE VIERNES
const promptMaestro = `Eres Viernes, el Asistente Ejecutivo de Abel. Usa emojis 🔴🔵🟢🟡🟣 según la importancia.`;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        handleSIGTERM: false, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    }
});

client.on('qr', async (qr) => { qrImageUrl = await qrcode.toDataURL(qr); });

client.on('ready', () => { 
    console.log('¡Viernes está en línea y conectado!'); 
    isReady = true; 
});

// 🧠 FUNCIÓN PARA GUARDAR EN LA BASE DE DATOS
async function guardarEnExcel(mensajeUsuario, respuestaViernes) {
    try {
        const fecha = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Sheet1!A:C', // Asegúrate que tu pestaña se llame Sheet1
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[fecha, mensajeUsuario, respuestaViernes]] }
        });
        console.log("✅ Dato guardado en el Cerebro Permanente");
    } catch (error) {
        console.error("❌ Error al guardar en Excel:", error.message);
    }
}

client.on('message_create', async (msg) => {
    // Solo responde a tus mensajes directos para evitar hablar con otros
    const miNumero = '573023597040@c.us';
    
    if (msg.from === miNumero && msg.to === miNumero && !msg.body.startsWith('🤖') && !msg.hasMedia) {
        try {
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: promptMaestro },
                    { role: "user", content: msg.body }
                ],
                model: "llama-3.3-70b-versatile",
            });
            
            const respuestaViernes = chatCompletion.choices[0].message.content;
            await msg.reply('🤖\n' + respuestaViernes);
            
            // Guardar en Excel
            guardarEnExcel(msg.body, respuestaViernes);
            
        } catch (error) {
            console.error("Error en el proceso:", error.message);
        }
    }
});

client.initialize();

app.get('/', (req, res) => {
    if (isReady) res.send("<h1>Viernes v3.3 ONLINE</h1>");
    else if (qrImageUrl) res.send(`<img src="${qrImageUrl}" style="width:300px;">`);
    else res.send("<h1>Iniciando sistema...</h1>");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
