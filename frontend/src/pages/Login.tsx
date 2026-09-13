import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.role === "ADMIN" ? "/admin" : "/member");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't sign you in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="shell" style={{ maxWidth: 420, paddingTop: 90 }}>
      <h1>Sign in</h1>
      <p>Leads and team members sign in here to manage events and photos.</p>
      {error && <div className="banner banner-error">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p style={{ marginTop: 20 }}>
        New here? <Link to="/register">Create an account</Link>
      </p>
      <hr className="hairline" />
      <p className="mono" style={{ fontSize: "0.78rem" }}>
        Have a gallery link instead? <Link to="/">Go to a customer gallery →</Link>
      </p>
    </div>
  );
}
