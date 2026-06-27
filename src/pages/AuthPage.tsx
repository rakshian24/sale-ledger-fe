import { useState } from "react";
import { loginUser, registerUser } from "../api/authApi";
import type { User } from "../types/auth";

type AuthPageProps = {
  onAuthSuccess: (user: User) => void;
};

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegister = mode === "register";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      const response = isRegister
        ? await registerUser({ name, email, password })
        : await loginUser({ email, password });

      onAuthSuccess(response.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Daily Business Tracker</p>
        <h1>Sale Ledger</h1>
        <p className="subtitle">
          Track cash, PhonePe/UPI, expenses, collection, and profit.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister ? (
            <label className="field">
              <span>Name</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                required
              />
            </label>
          ) : null}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 6 characters"
              required
            />
          </label>

          {error ? <p className="error-message">{error}</p> : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Please wait..." : isRegister ? "Create Account" : "Login"}
          </button>
        </form>

        <button
          type="button"
          className="text-button"
          onClick={() => {
            setError("");
            setMode(isRegister ? "login" : "register");
          }}
        >
          {isRegister
            ? "Already have an account? Login"
            : "New user? Create an account"}
        </button>
      </section>
    </main>
  );
}
