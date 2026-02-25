import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("platform.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    profile_id TEXT,
    avatar TEXT,
    status TEXT DEFAULT 'Connected',
    drive_folder_id TEXT,
    daily_limit INTEGER DEFAULT 10,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT,
    file_id TEXT UNIQUE,
    type TEXT,
    size INTEGER,
    aspect_ratio TEXT,
    status TEXT DEFAULT 'Pending',
    caption TEXT,
    scheduled_time DATETIME,
    snapchat_link TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    file_name TEXT,
    action TEXT,
    status TEXT,
    error_message TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/stats", (req, res) => {
    const totalMedia = db.prepare("SELECT COUNT(*) as count FROM media").get() as any;
    const pending = db.prepare("SELECT COUNT(*) as count FROM media WHERE status = 'Pending'").get() as any;
    const publishedToday = db.prepare("SELECT COUNT(*) as count FROM media WHERE status = 'Published' AND date(created_at) = date('now')").get() as any;
    const failed = db.prepare("SELECT COUNT(*) as count FROM media WHERE status = 'Failed'").get() as any;
    
    const recentActivity = db.prepare("SELECT * FROM media ORDER BY created_at DESC LIMIT 5").all();
    
    res.json({
      stats: {
        totalMedia: totalMedia.count,
        pending: pending.count,
        publishedToday: publishedToday.count,
        failed: failed.count
      },
      recentActivity
    });
  });

  app.get("/api/channels", (req, res) => {
    const channels = db.prepare("SELECT * FROM channels").all();
    res.json(channels);
  });

  app.post("/api/channels", (req, res) => {
    const { name, profile_id, drive_folder_id, daily_limit } = req.body;
    const info = db.prepare("INSERT INTO channels (name, profile_id, drive_folder_id, daily_limit) VALUES (?, ?, ?, ?)").run(name, profile_id, drive_folder_id, daily_limit);
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/media", (req, res) => {
    const media = db.prepare("SELECT * FROM media ORDER BY created_at DESC").all();
    res.json(media);
  });

  app.post("/api/media/scan", (req, res) => {
    // Mocking a drive scan
    const mockFiles = [
      { file_name: "snap_story_01.mp4", file_id: "drive_1", type: "video", size: 1024 * 1024 * 5, aspect_ratio: "9:16" },
      { file_name: "promo_shot.jpg", file_id: "drive_2", type: "image", size: 1024 * 512, aspect_ratio: "9:16" },
      { file_name: "behind_the_scenes.mp4", file_id: "drive_3", type: "video", size: 1024 * 1024 * 12, aspect_ratio: "16:9" },
    ];

    let newCount = 0;
    for (const file of mockFiles) {
      try {
        db.prepare("INSERT INTO media (file_name, file_id, type, size, aspect_ratio) VALUES (?, ?, ?, ?, ?)").run(file.file_name, file.file_id, file.type, file.size, file.aspect_ratio);
        newCount++;
      } catch (e) {
        // Duplicate file_id
      }
    }

    db.prepare("INSERT INTO logs (file_name, action, status) VALUES (?, ?, ?)").run("System", "Drive Scan", "Success");
    res.json({ newCount });
  });

  app.patch("/api/media/:id", (req, res) => {
    const { id } = req.params;
    const { caption, scheduled_time, status } = req.body;
    
    if (caption !== undefined) db.prepare("UPDATE media SET caption = ? WHERE id = ?").run(caption, id);
    if (scheduled_time !== undefined) db.prepare("UPDATE media SET scheduled_time = ? WHERE id = ?").run(scheduled_time, id);
    if (status !== undefined) db.prepare("UPDATE media SET status = ? WHERE id = ?").run(status, id);
    
    res.json({ success: true });
  });

  app.get("/api/logs", (req, res) => {
    const logs = db.prepare("SELECT * FROM logs ORDER BY timestamp DESC LIMIT 50").all();
    res.json(logs);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
