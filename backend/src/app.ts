import express from "express";
import cors from "cors";
import path from "path";
import { authRouter } from "./routes/auth.routes";
import { eventsRouter } from "./routes/events.routes";
import { photosRouter } from "./routes/photos.routes";
import { galleryRouter, publicGalleryRouter } from "./routes/gallery.routes";

export function createApp() {
  const app = express();

  const allowedOrigins = (process.env.CORS_ORIGIN || "*").split(",").map((o) => o.trim());
  app.use(cors({ origin: allowedOrigins }));
  app.use(express.json());

  // Locally-stored photo files (swap for a CDN/bucket URL in production)
  app.use("/files", express.static(path.join(__dirname, "..", "uploads")));

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRouter);
  app.use("/api/events", eventsRouter);
  app.use("/api", photosRouter);
  app.use("/api", galleryRouter);
  app.use("/api/public/gallery", publicGalleryRouter);

  // Central error handler — catches multer errors (bad file type, too large)
  // and anything else that slipped past a route's own try/catch.
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err?.message) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: "Something went wrong" });
  });

  return app;
}
