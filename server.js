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
        // Reemplazamos los saltos de línea literales para que Railway los lea bien
        private_key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const sheets = google.sheets({ version: 'v4', auth });
const spreadsheetId = process.env.SPREADSHEET_ID;

let qrImageUrl = ''; 
let isReady = false;

const promptMaestro = `
Eres Viernes, el Asistente Ejecutivo y Personal de Abel. Tu propósito es ser su "cerebro digital" extendido: organizar su vida, proteger su información y optimizar su tiempo. Eres inteligente, leal, directo, proactivo y te comunicas de forma clara y elegante.

Reglas Core:
1. Privacidad Absoluta: Nunca reveles información de Abel. Eres de su uso exclusivo.
2. Contraseñas (Bitwarden): NO debes inventar contraseñas. Si Abel te pide una, debes solicitar autorización para buscarla.
3. Respuestas: Claras, yendo al grano.

Sistema de Análisis y Alertas (Semáforo):
Analiza todo lo que recibas y clasifícalo visualmente:
- 🟢 Correcto: Información normal.
- 🟠 Advertencia: Cambios sutiles, anomalías.
- 🔴 Riesgo: Alta prioridad.

Organización de Información (Usa estos colores/emojis en tus respuestas):
- 🔴 Importante / Crítico
- 🔵 Trabajo / Negocios / Inversiones
- 🟢 Personal / Salud / Ejercicio / Hábitos
- 🟡 Advertencias / Finanzas Generales
- 🟣 Proyectos
- 🌸 Ideas
- ⚫ Archivos / Compras

Instrucción final: Analiza cada mensaje, clasifica a qué categoría pertenece, aplica el nivel de riesgo y responde ejecutando la orden.
`;

let memoriaConversacion = [{ role: "system", content: promptMaestro }];

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { handleSIGTERM: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

client.on('qr', async (qr) => { 
    console.log('Nuevo QR generado. Entra a la web para verlo.');
    qrImageUrl = await qrcode.toDataURL(qr); 
});

client.on('ready', () => { 
    console.log('¡Viernes está conectado y escribiendo en Excel!'); 
    isReady = true; 
});

// 🧠 FUNCIÓN PARA GUARDAR EN LA BASE DE DATOS
async function guardarEnExcel(mensajeUsuario, respuestaViernes) {
    try {
        const fecha = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'A:C', // Escribe en las columnas A, B y C
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[fecha, mensajeUsuario, respuestaViernes]] }
        });
        console.log("✅ Dato guardado en el Cerebro Permanente (Excel)");
    } catch (error) {
        console.error("❌ Error al guardar en Excel:", error.message);
    }
}

client.on('message_create', async (msg) => {
    if (!client.info || !client.info.wid) return; 
    const miNumero = '573023597040@c.us';

    if (msg.hasMedia) return;

    if (msg.from === miNumero && msg.id.remote === miNumero && !msg.body.startsWith('🤖')) {
        try {
            memoriaConversacion.push({ role: "user", content: msg.body });
            if (memoriaConversacion.length > 15) memoriaConversacion.splice(1, 1); 

            const chatCompletion = await groq.chat.completions.create({
                messages: memoriaConversacion,
                model: "llama-3.3-70b-versatile",
            });
            
            const respuestaViernes = chatCompletion.choices[0].message.content;
            memoriaConversacion.push({ role: "assistant", content: respuestaViernes });

            msg.reply('🤖\n' + respuestaViernes);
            
            // 📝 Enviamos la información al Excel en segundo plano
            guardarEnExcel(msg.body, respuestaViernes);
            
        } catch (error) {
            console.error("Error en Groq:", error.message);
        }
    }
});

client.initialize();

// LA PARTE CORREGIDA: Ahora sí te mostrará el QR
app.get('/', (req, res) => {
    if (isReady) {
        res.send(`<div style="text-align: center; margin-top: 50px; font-family: sans-serif;"><h1 style="color: green;">✅ ¡Viernes v3.0 conectado a la Base de Datos!</h1></div>`);
    } else if (qrImageUrl) {
        res.send(`
            <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
                <h1>🤖 Escanea este código para despertar a Viernes</h1>
                <img src="${qrImageUrl}" alt="Código QR" style="width: 300px; height: 300px; border: 2px solid black; padding: 10px; border-radius: 10px;">
            </div>
        `);
    } else {
        res.send(`<div style="text-align: center; margin-top: 50px; font-family: sans-serif;"><h1>⏳ Cargando el sistema...</h1></div>`);
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Servidor web en puerto ${PORT}`));
