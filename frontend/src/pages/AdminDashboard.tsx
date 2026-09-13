import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { Navbar } from "../components/Navbar";

interface EventSummary {
  id: string;
  name: string;
  createdAt: string;
  gallery: { slug: string } | null;
  _count: { photos: number; members: number };
}

export function AdminDashboard() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await api.get("/api/events");
    setEvents(res.events);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await api.post("/api/events", { name });
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create the event.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <Navbar />
      <div className="shell" style={{ paddingTop: 40, paddingBottom: 80 }}>
        <h1>Your events</h1>
        <p>Create an event, bring your team on, then review and publish a gallery once photos are in.</p>

        <form onSubmit={onCreate} style={{ display: "flex", gap: 10, alignItems: "flex-end", maxWidth: 480 }}>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label htmlFor="eventName">New event name</label>
            <input
              id="eventName"
              placeholder="e.g. Arjun & Priya Wedding"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={creating}>
            {creating ? "Creating…" : "Create event"}
          </button>
        </form>
        {error && (
          <div className="banner banner-error" style={{ marginTop: 14, maxWidth: 480 }}>
            {error}
          </div>
        )}

        <hr className="hairline" />

        {loading ? (
          <p>Loading events…</p>
        ) : events.length === 0 ? (
          <p>No events yet — create your first one above.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {events.map((ev) => (
              <Link
                key={ev.id}
                to={`/admin/events/${ev.id}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "18px 4px",
                  borderBottom: "1px solid var(--border)",
                  textDecoration: "none",
                  color: "var(--text)",
                }}
              >
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>{ev.name}</div>
                  <div className="mono" style={{ fontSize: "0.78rem", color: "var(--text-faint)" }}>
                    {ev._count.photos} photos · {ev._count.members} team members
                    {ev.gallery ? " · gallery published" : ""}
                  </div>
                </div>
                <span style={{ color: "var(--accent)" }}>→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
