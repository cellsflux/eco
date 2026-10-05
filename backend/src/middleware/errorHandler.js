function notFound(req, res) {
  res.status(404).json({ error: `Route introuvable: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error("[Erreur]", err);

  if (err.name === "ZodError") {
    return res.status(400).json({
      error: "Données invalides.",
      details: err.issues?.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({ error: "Cet email est déjà utilisé." });
  }

  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? "Erreur serveur." : err.message,
  });
}

module.exports = { notFound, errorHandler };
