import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { PhotoGrid, GridPhoto } from "../components/PhotoGrid";

export function GalleryAccess() {
  const { slug } = useParams<{ slug: string }>();
  const [eventName, setEventName] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [photos, setPhotos] = useState<GridPhoto[] | null>(null);

  useEffect(() => {
    api
      .get(`/api/public/gallery/${slug}`)
      .then((res) => setEventName(res.eventName))
      .catch(() => setNotFound(true));
  }, [slug]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setChecking(true);
    try {
      const res = await api.post(`/api/public/gallery/${slug}/access`, { pin });
      setEventName(res.eventName);
      setPhotos(res.photos.map((p: any) => ({ ...p, storageLocation: p.url })));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't open the gallery.");
    } finally {
      setChecking(false);
    }
  }

  if (notFound) {
    return (
      <div className="shell" style={{ maxWidth: 480, paddingTop: 100, textAlign: "center" }}>
        <h1>Gallery not found</h1>
        <p>This link may be mistyped or the gallery may no longer be available. Check the link you were sent.</p>
      </div>
    );
  }

  if (photos) {
    return (
      <div className="shell" style={{ paddingTop: 60, paddingBottom: 100 }}>
        <h1>{eventName}</h1>
        <p>{photos.length} photos in this gallery.</p>
        <PhotoGrid photos={photos} />
      </div>
    );
  }

  return (
    <div className="shell" style={{ maxWidth: 420, paddingTop: 100, textAlign: "center" }}>
      <div
        className="mono"
        style={{ fontSize: "0.78rem", color: "var(--text-faint)", marginBottom: 8 }}
      >
        GALLERY
      </div>
      <h1>{eventName || "Loading…"}</h1>
      <p>Enter the 6-digit PIN you were given to view these photos.</p>
      {error && <div className="banner banner-error">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="field">
          <input
            className="pin-input"
            inputMode="numeric"
            maxLength={6}
            pattern="[0-9]{6}"
            required
            placeholder="000000"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={checking} style={{ width: "100%" }}>
          {checking ? "Checking…" : "View gallery"}
        </button>
      </form>
    </div>
  );
}
