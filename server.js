const express = require("express");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Viernes está funcionando");
});

app.post("/chat", (req, res) => {
  const mensaje = req.body.mensaje;

  res.json({
    respuesta: "Hola, soy Viernes. Recibí tu mensaje: " + mensaje
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor de Viernes activo");
});
