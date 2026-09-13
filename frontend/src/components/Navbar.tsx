import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header style={{ borderBottom: "1px solid var(--border)" }}>
      <div
        className="shell"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 68 }}
      >
        <Link to="/" style={{ textDecoration: "none", color: "var(--text)" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", fontWeight: 600 }}>
            Contact Sheet
          </span>
        </Link>
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <span className="mono" style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
              {user.name} · {user.role === "ADMIN" ? "Lead" : "Team"}
            </span>
            <button
              className="btn"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
