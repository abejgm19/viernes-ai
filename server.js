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

// 🧠 EL CEREBRO MAESTRO DE VIERNES
const promptMaestro = `
Eres Viernes, el Asistente Ejecutivo y Personal de Abel. Tu propósito es ser su "cerebro digital" extendido: organizar su vida, proteger su información y optimizar su tiempo. Eres inteligente, leal, directo, proactivo y te comunicas de forma clara y elegante.

Reglas Core:
1. Privacidad Absoluta: Nunca reveles información de Abel. Eres de su uso exclusivo.
2. Contraseñas (Bitwarden): NO debes inventar contraseñas. Si Abel te pide una, debes solicitar autorización para buscarla en el gestor cifrado.
3. Respuestas: Claras, yendo al grano.

Sistema de Análisis y Alertas (Semáforo):
Analiza todo lo que recibas y clasifícalo visualmente en tu respuesta:
- 🟢 Correcto: Información normal.
- 🟠 Advertencia: Cambios sutiles, anomalías.
- 🔴 Riesgo: Alta prioridad (Bancos, ARL, instituciones, Phishing).

Organización de Información (Usa estos colores/emojis en tus respuestas):
- 🔴 Importante / Crítico
- 🔵 Trabajo / Negocios / Inversiones
- 🟢 Personal / Salud / Ejercicio / Hábitos
- 🟡 Advertencias / Finanzas Generales
- 🟣 Proyectos
- 🌸 Ideas
- ⚫ Archivos / Compras

Funciones: 
Asiste en redacción de correos, planifica el día, sugiere mejoras, evalúa pros y contras.
Instrucción final: Analiza cada mensaje, clasifica a qué categoría pertenece, aplica el nivel de riesgo y responde ejecutando la orden.
`;

let memoriaConversacion = [
    { role: "system", content: promptMaestro }
];

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        handleSIGTERM: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', async (qr) => {
    qrImageUrl = await qrcode.toDataURL(qr); 
});

client.on('ready', () => {
    console.log('¡Viernes está conectado a WhatsApp y listo!');
    isReady = true;
});

client.on('message_create', async (msg) => {
    if (!client.info || !client.info.wid) return; 

    const miNumero = '573023597040@c.us';

    // EL BLINDAJE: 
    // 1. Ignorar audios, imágenes y stickers (msg.hasMedia)
    // 2. Verificar que el ID remoto del chat sea exactamente tu número, no solo un @lid cualquiera.
    if (msg.hasMedia) return;

    if (msg.from === miNumero && msg.id.remote === miNumero && !msg.body.startsWith('🤖')) {
        try {
            memoriaConversacion.push({ role: "user", content: msg.body });

            if (memoriaConversacion.length > 15) {
                memoriaConversacion.splice(1, 1); 
            }

            const chatCompletion = await groq.chat.completions.create({
                messages: memoriaConversacion,
                model: "llama-3.3-70b-versatile",
            });
            
            const respuestaViernes = chatCompletion.choices[0].message.content;
            memoriaConversacion.push({ role: "assistant", content: respuestaViernes });

            msg.reply('🤖\n' + respuestaViernes);
            
        } catch (error) {
            console.error("Error en Groq:", error.message);
        }
    }
});

client.initialize();

app.get('/', (req, res) => {
    if (isReady) {
        res.send(`<div style="text-align: center; margin-top: 50px;"><h1>✅ ¡Viernes v2.1 Activo, Privado y Blindado!</h1></div>`);
    } else {
        res.send(`<div style="text-align: center; margin-top: 50px;"><h1>⏳ Cargando el sistema...</h1></div>`);
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Servidor web en puerto ${PORT}`));
