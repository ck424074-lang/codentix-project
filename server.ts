import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";

const dbPath = path.resolve(process.cwd(), "history.db");
const db = new Database(dbPath);

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    originalCode TEXT NOT NULL,
    improvedCode TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    language TEXT NOT NULL,
    timeComplexity TEXT NOT NULL,
    spaceComplexity TEXT NOT NULL,
    cyclomaticComplexity INTEGER NOT NULL,
    hash TEXT UNIQUE NOT NULL
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API routes
  app.post("/api/history", (req, res) => {
    try {
      const { originalCode, improvedCode, language, complexity } = req.body;
      
      if (!originalCode || !improvedCode) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Hash to prevent exact duplicates
      const hash = crypto.createHash('sha256').update(originalCode + improvedCode).digest('hex');

      const stmt = db.prepare(`
        INSERT OR IGNORE INTO history (
          originalCode, improvedCode, timestamp, language, 
          timeComplexity, spaceComplexity, cyclomaticComplexity, hash
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const info = stmt.run(
        originalCode,
        improvedCode,
        new Date().toISOString(),
        language || 'unknown',
        complexity?.time || 'unknown',
        complexity?.space || 'unknown',
        complexity?.cyclomatic || 0,
        hash
      );

      res.json({ success: true, inserted: info.changes > 0 });
    } catch (error) {
      console.error("Error saving history:", error);
      res.status(500).json({ error: "Failed to save history" });
    }
  });

  app.get("/api/history", (req, res) => {
    try {
      const stmt = db.prepare("SELECT * FROM history ORDER BY timestamp DESC LIMIT 100");
      const history = stmt.all();
      res.json(history);
    } catch (error) {
      console.error("Error reading history:", error);
      res.status(500).json({ error: "Failed to read history" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
