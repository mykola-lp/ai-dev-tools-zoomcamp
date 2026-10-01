import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { register } from "../api/auth";
import { getErrorMessage } from "../api/errors";

import "./auth.css";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setSubmitting(true);
  
    try {
      await register({ email, password, display_name: displayName });
      setSubmitted(true);
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Check back soon</h1>
          <p>Thanks for registering! Please wait for an admin to approve your account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Register</h1>

        <form className="form" onSubmit={handleSubmit}>
          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}

          <label className="field">
            Display name
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </label>

          <label className="field">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="field">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button className="button" type="submit" disabled={submitting}>
            Register
          </button>
        </form>

        <p className="auth-switch">
          Already approved? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
