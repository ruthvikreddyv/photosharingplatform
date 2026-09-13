import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

export function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [slug, setSlug] = useState("");

  if (user) {
    return <Navigate to={user.role === "ADMIN" ? "/admin" : "/member"} replace />;
  }

  function onOpenGallery(e: FormEvent) {
    e.preventDefault();
    const cleaned = slug.trim().replace(/^.*\/gallery\//, "");
    if (cleaned) navigate(`/gallery/${cleaned}`);
  }

  return (
    <div className="shell" style={{ maxWidth: 560, paddingTop: 110 }}>
      <div className="mono" style={{ fontSize: "0.78rem", color: "var(--text-faint)", marginBottom: 10 }}>
        EVENT PHOTO SHARING
      </div>
      <h1>Contact Sheet</h1>
      <p>
        The place event teams upload photos, leads pick the best of the roll, and customers view the
        finished set — no account required on their end.
      </p>

      <div style={{ display: "grid", gap: 24, marginTop: 40, gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 20 }}>
          <h3>I'm on the team</h3>
          <p style={{ fontSize: "0.9rem" }}>Sign in to manage events, upload photos, or publish a gallery.</p>
          <Link to="/login" className="btn btn-primary" style={{ display: "inline-block" }}>
            Sign in
          </Link>
        </div>
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 20 }}>
          <h3>I have a gallery link</h3>
          <form onSubmit={onOpenGallery}>
            <input
              placeholder="Paste your link or code"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 11px",
                marginBottom: 10,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                color: "var(--text)",
                fontSize: "0.9rem",
              }}
            />
            <button className="btn" type="submit" style={{ width: "100%" }}>
              Open gallery
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
