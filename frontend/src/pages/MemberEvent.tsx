import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { Navbar } from "../components/Navbar";
import { PhotoGrid, GridPhoto } from "../components/PhotoGrid";

export function MemberEvent() {
  const { eventId } = useParams<{ eventId: string }>();
  const [eventName, setEventName] = useState("");
  const [photos, setPhotos] = useState<GridPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInput = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const detail = await api.get(`/api/events/${eventId}`);
    setEventName(detail.event.name);
    const photoRes = await api.get(`/api/events/${eventId}/photos`);
    setPhotos(photoRes.photos.map((p: any) => ({ ...p, storageLocation: p.storageLocation })));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function onFilesChosen(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("photos", f));
    try {
      await api.upload(`/api/events/${eventId}/photos`, formData);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div>
      <Navbar />
      <div className="shell" style={{ paddingTop: 40, paddingBottom: 80 }}>
        {loading ? (
          <p>Loading event…</p>
        ) : (
          <>
            <h1>{eventName}</h1>
            <p>Upload photos from this event. Your Lead will review and select which ones to publish.</p>

            <div style={{ marginBottom: 28 }}>
              <input
                ref={fileInput}
                id="photoUpload"
                type="file"
                accept="image/*"
                multiple
                onChange={onFilesChosen}
                disabled={uploading}
                style={{ display: "none" }}
              />
              <label htmlFor="photoUpload" className="btn btn-primary" style={{ display: "inline-block" }}>
                {uploading ? "Uploading…" : "Upload photos"}
              </label>
              {error && (
                <div className="banner banner-error" style={{ marginTop: 14, maxWidth: 480 }}>
                  {error}
                </div>
              )}
            </div>

            <hr className="hairline" />

            <h2>Your uploads ({photos.length})</h2>
            <PhotoGrid photos={photos} emptyLabel="You haven't uploaded any photos to this event yet." />
          </>
        )}
      </div>
    </div>
  );
}
