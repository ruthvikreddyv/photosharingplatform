import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { Navbar } from "../components/Navbar";
import { PhotoGrid, GridPhoto } from "../components/PhotoGrid";

interface Member {
  id: string;
  name: string;
  email: string;
}

interface Photo extends GridPhoto {
  storageLocation: string;
  uploadedById: string;
}

export function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const [eventName, setEventName] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [publishedGallery, setPublishedGallery] = useState<{ slug: string } | null>(null);

  const [memberEmail, setMemberEmail] = useState("");
  const [memberError, setMemberError] = useState<string | null>(null);
  const [memberBusy, setMemberBusy] = useState(false);

  const [publishResult, setPublishResult] = useState<{ slug: string; pin: string } | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const detail = await api.get(`/api/events/${eventId}`);
    setEventName(detail.event.name);
    setMembers(detail.members);
    setPublishedGallery(detail.gallery);
    const photoRes = await api.get(`/api/events/${eventId}/photos`);
    setPhotos(photoRes.photos);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function onAddMember(e: FormEvent) {
    e.preventDefault();
    setMemberError(null);
    setMemberBusy(true);
    try {
      await api.post(`/api/events/${eventId}/members`, { email: memberEmail });
      setMemberEmail("");
      await load();
    } catch (err) {
      setMemberError(err instanceof ApiError ? err.message : "Couldn't add that team member.");
    } finally {
      setMemberBusy(false);
    }
  }

  function toggleSelection(photo: GridPhoto) {
    const next = !photo.selected;
    setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, selected: next } : p)));
    api.patch(`/api/photos/${photo.id}/select`, { selected: next }).catch(() => {
      // Roll back optimistic update on failure
      setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, selected: !next } : p)));
    });
  }

  async function onPublish() {
    setPublishError(null);
    const selectedIds = photos.filter((p) => p.selected).map((p) => p.id);
    if (selectedIds.length === 0) {
      setPublishError("Select at least one photo before publishing.");
      return;
    }
    setPublishing(true);
    try {
      const res = await api.post(`/api/events/${eventId}/gallery`, { photoIds: selectedIds });
      setPublishResult({ slug: res.gallery.slug, pin: res.pin });
      setPublishedGallery({ slug: res.gallery.slug });
    } catch (err) {
      setPublishError(err instanceof ApiError ? err.message : "Couldn't publish the gallery.");
    } finally {
      setPublishing(false);
    }
  }

  const selectedCount = photos.filter((p) => p.selected).length;
  const galleryUrl = publishResult ? `${window.location.origin}/gallery/${publishResult.slug}` : "";

  return (
    <div>
      <Navbar />
      <div className="shell" style={{ paddingTop: 40, paddingBottom: 100 }}>
        {loading ? (
          <p>Loading event…</p>
        ) : (
          <>
            <h1>{eventName}</h1>

            <section style={{ marginBottom: 32 }}>
              <h2>Team</h2>
              <p>Add a Team Member by the email they registered with. They'll see this event once added.</p>
              <form onSubmit={onAddMember} style={{ display: "flex", gap: 10, maxWidth: 480 }}>
                <input
                  type="email"
                  required
                  placeholder="teammate@example.com"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    color: "var(--text)",
                  }}
                />
                <button className="btn" type="submit" disabled={memberBusy}>
                  {memberBusy ? "Adding…" : "Add"}
                </button>
              </form>
              {memberError && (
                <div className="banner banner-error" style={{ marginTop: 12, maxWidth: 480 }}>
                  {memberError}
                </div>
              )}
              <ul style={{ paddingLeft: 0, listStyle: "none", marginTop: 16 }}>
                {members.map((m) => (
                  <li key={m.id} className="mono" style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    {m.name} — {m.email}
                  </li>
                ))}
                {members.length === 0 && <li style={{ color: "var(--text-faint)" }}>No team members yet.</li>}
              </ul>
            </section>

            <hr className="hairline" />

            <section style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <h2>Photos ({photos.length})</h2>
                <span className="mono" style={{ fontSize: "0.82rem", color: "var(--selected)" }}>
                  {selectedCount} selected
                </span>
              </div>
              <p>Click a frame to mark it for the published gallery.</p>
              <PhotoGrid photos={photos} onToggle={toggleSelection} emptyLabel="No photos uploaded yet." />
            </section>

            <hr className="hairline" />

            <section>
              <h2>Publish gallery</h2>
              {publishedGallery && !publishResult && (
                <div className="banner banner-info">
                  A gallery is already live at <span className="mono">/gallery/{publishedGallery.slug}</span>.
                  Publishing again will reset the PIN and replace the photo set with your current selection.
                </div>
              )}
              {publishError && <div className="banner banner-error">{publishError}</div>}
              <button className="btn btn-primary" onClick={onPublish} disabled={publishing}>
                {publishing ? "Publishing…" : publishedGallery ? "Re-publish gallery" : "Publish gallery"}
              </button>

              {publishResult && (
                <div
                  style={{
                    marginTop: 20,
                    padding: 20,
                    border: "1px solid var(--accent)",
                    borderRadius: "var(--radius)",
                    background: "var(--surface-raised)",
                  }}
                >
                  <p style={{ color: "var(--text)", marginBottom: 12 }}>
                    Gallery published. Share this link and PIN with the customer — the PIN is shown only
                    once, so save it now.
                  </p>
                  <div className="mono" style={{ fontSize: "0.95rem", marginBottom: 6 }}>
                    Link: <a href={galleryUrl}>{galleryUrl}</a>
                  </div>
                  <div className="mono" style={{ fontSize: "1.3rem", letterSpacing: "0.2em" }}>
                    PIN: {publishResult.pin}
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
