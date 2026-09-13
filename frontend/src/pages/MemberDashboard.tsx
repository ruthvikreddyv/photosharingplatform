import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Navbar } from "../components/Navbar";

interface EventSummary {
  id: string;
  name: string;
  _count: { photos: number };
}

export function MemberDashboard() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/events").then((res) => {
      setEvents(res.events);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <Navbar />
      <div className="shell" style={{ paddingTop: 40, paddingBottom: 80 }}>
        <h1>Your assigned events</h1>
        <p>Upload photos to any event your Lead has added you to.</p>
        <hr className="hairline" />
        {loading ? (
          <p>Loading…</p>
        ) : events.length === 0 ? (
          <p>No events assigned to you yet. Ask your Lead to add your email to an event.</p>
        ) : (
          <div>
            {events.map((ev) => (
              <Link
                key={ev.id}
                to={`/member/events/${ev.id}`}
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
                <div style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>{ev.name}</div>
                <span style={{ color: "var(--accent)" }}>→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
