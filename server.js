import express from "express";

const app = express();

app.get("/", (req, res) => {
  res.send("Viernes está funcionando");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});
