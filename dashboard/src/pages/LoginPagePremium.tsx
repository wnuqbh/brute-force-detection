import { useState, type FormEvent } from "react";
import {
  ShieldCheck,
  User,
  Lock,
  Activity,
  Users,
  KeyRound,
} from "lucide-react";
import "./LoginPagePremium.css";

type LoginPagePremiumProps = {
  onLogin: () => void;
};

type LoginResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  user?: {
    id: number;
    username: string;
    role: string;
  };
};

export default function LoginPagePremium({ onLogin }: LoginPagePremiumProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setError("Please enter username and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: cleanUsername,
          password: cleanPassword,
        }),
      });

      let data: LoginResponse = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (response.status === 401) {
        setError("Incorrect username or password.");
        return;
      }

      if (!response.ok || !data.success) {
        setError(data.error || "Incorrect username or password.");
        return;
      }

      onLogin();
    } catch {
      setError("Unable to connect to backend server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="premium-login-page">
      <div className="premium-bg-shield"></div>
      <div className="premium-bg-grid"></div>
      <div className="premium-bg-circuit circuit-left"></div>
      <div className="premium-bg-circuit circuit-right"></div>

      <section className="premium-login-shell">
        <div className="premium-welcome-panel">
          <div className="premium-welcome-content premium-welcome-structured">
            <div className="premium-brand-row">
              <div className="premium-brand-icon">
                <ShieldCheck size={24} strokeWidth={2.2} />
              </div>

              <p className="premium-brand-name">
                BruteForce <span>Sentinel</span>
              </p>
            </div>

            <p className="premium-eyebrow">AI-POWERED PROTECTION</p>

            <h1 className="premium-hero-title">
              Detect threats before they become breaches
            </h1>

            <p className="premium-hero-description">
              Real-time brute-force detection and secure authentication
              monitoring for your infrastructure.
            </p>

            <div className="premium-feature-stack">
              <div className="premium-feature-card">
                <Activity size={20} strokeWidth={2.2} />
                <div>
                  <strong>Threat monitoring</strong>
                  <span>Live attack pattern analysis</span>
                </div>
              </div>

              <div className="premium-feature-card">
                <Users size={20} strokeWidth={2.2} />
                <div>
                  <strong>Role-based access</strong>
                  <span>Granular permission control</span>
                </div>
              </div>

              <div className="premium-feature-card">
                <Lock size={20} strokeWidth={2.2} />
                <div>
                  <strong>Secure access</strong>
                  <span>End-to-end encrypted sessions</span>
                </div>
              </div>
            </div>

            <div className="premium-protected-note">
              <KeyRound size={16} strokeWidth={2.2} />
              <span>Protected login portal · Security analytics dashboard</span>
            </div>
          </div>

          <div className="premium-circle premium-circle-left"></div>
          <div className="premium-circle premium-circle-right"></div>
        </div>

        <div className="premium-signin-panel">
          <form className="premium-signin-box" onSubmit={handleLogin}>
            <h2>Sign in</h2>

            <p className="premium-signin-subtitle">
              Access your brute-force detection dashboard securely
            </p>

            <div className="premium-input-group">
              <User size={23} strokeWidth={2.1} />
              <input
                type="text"
                placeholder="User Name"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>

            <div className="premium-input-group">
              <Lock size={23} strokeWidth={2.1} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />

              <button
                type="button"
                className="premium-show-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "HIDE" : "SHOW"}
              </button>
            </div>

            {error && <p className="premium-login-error">{error}</p>}

            <div className="premium-login-options">
              <label className="premium-remember-me">
                <input type="checkbox" defaultChecked />
                <span>Remember me</span>
              </label>

              <button type="button" className="premium-forgot-password">
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              className="premium-signin-button"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <div className="premium-security-note">
              <ShieldCheck size={28} strokeWidth={2.1} />
              <p>
                Security features enabled: Activity Logging and Attack
                Monitoring
              </p>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}