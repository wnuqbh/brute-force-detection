import { useState } from "react";
import {
  ShieldCheck,
  User,
  Lock,
  Activity,
  KeyRound,
  Users,
} from "lucide-react";
import "./LoginPage.css";

type LoginPageProps = {
  onLogin: () => void;
};

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleLogin() {
    if (!username || !password) {
      alert("Please enter username and password");
      return;
    }

    onLogin();
  }

  return (
    <div className="login-page">
      <div className="login-shell">
        <section className="welcome-panel">
          <div className="welcome-content">
            <div className="brand-shield">
              <ShieldCheck size={52} />
            </div>

            <p className="welcome-label">WELCOME</p>

            <h1>
              BruteForce <span>Sentinel</span>
            </h1>

            <p className="welcome-description">
              AI-powered brute-force attack detection and secure authentication
              monitoring.
            </p>

            <div className="security-chips">
              <div className="security-chip">
                <Activity size={22} />
                <div>
                  <strong>Threat</strong>
                  <span>Monitoring</span>
                </div>
              </div>


              <div className="security-chip">
                <Users size={22} />
                <div>
                  <strong>Role-Based</strong>
                  <span>Access</span>
                </div>
              </div>
            </div>
          </div>

          <div className="circle circle-left"></div>
          <div className="circle circle-right"></div>

          <div className="protected-note">
            <KeyRound size={18} />
            <span>Protected login portal for security analytics dashboard</span>
          </div>
        </section>

        <section className="signin-panel">
          <div className="signin-box">
            <h2>Sign in</h2>
            <p className="signin-subtitle">
              Access your brute-force detection dashboard securely
            </p>

            <div className="input-group">
              <User size={22} />
              <input
                type="text"
                placeholder="User Name"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>

            <div className="input-group">
              <Lock size={22} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="show-password-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "HIDE" : "SHOW"}
              </button>
            </div>

            <div className="login-options">
              <label className="remember-me">
                <input type="checkbox" defaultChecked />
                <span>Remember me</span>
              </label>

              <button type="button" className="forgot-password">
                Forgot Password?
              </button>
            </div>

            <button type="button" className="sign-in-btn" onClick={handleLogin}>
              Sign in
            </button>

            <div className="security-note">
              <ShieldCheck size={26} />
              <p>
                Security features enabled: Activity Logging and Attack
                Monitoring
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}