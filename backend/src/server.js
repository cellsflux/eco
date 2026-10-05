require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const connectDB = require("./config/db");
const authRoutes = require("./routes/auth.routes");
const oauthRoutes = require("./routes/oauth.routes");
const etablissementRoutes = require("./routes/etablissement.routes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/health", (req, res) => res.json({ ok: true }));

// Logos d'établissement, stockés momentanément sur le disque du backend
// (voir middleware/uploadLogo.js). Le header CORP est desserré uniquement
// pour ce chemin: le web (autre origine via le proxy Next) et Electron
// (protocole file://) doivent tous deux pouvoir charger ces images en <img>,
// ce que la politique par défaut de helmet bloquerait sinon.
app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.join(__dirname, "../uploads")),
);

app.use("/api/auth", authRoutes);
app.use("/api/oauth", oauthRoutes);
app.use("/api/etablissements", etablissementRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`[CellsFlux API] En écoute sur http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Impossible de démarrer le serveur:", err);
    process.exit(1);
  }
}

start();

module.exports = app;
