import { useState } from "react";
import API_URL from "./api";

function Login({ onLogin, onRegister }) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const identifier = formData.email.trim();
    const password = formData.password;

    if (!identifier || !password) {
      setError("Please enter your email/username and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: identifier,
          username: identifier,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Invalid email/username or password.");
        return;
      }

      // Support a response where user/token are nested in data.
      const user = data.user || data.data?.user;
      const token = data.token || data.data?.token;

      if (!user || !user.role) {
        console.error("Unexpected login response:", data);
        setError(
          data.message ||
            "The server did not return user details. Check the backend login route."
        );
        return;
      }

      if (!token || typeof token !== "string") {
        console.error("Login response has no token:", data);
        setError(
          "The backend login route did not return an authentication token. The server must generate a JWT."
        );
        return;
      }

      localStorage.setItem("corproute-token", token);

      if (typeof onLogin === "function") {
        onLogin(user);
      } else {
        setError("Login navigation is not configured correctly.");
      }
    } catch (err) {
      console.error("Login error:", err);

      setError(
        "Unable to connect to the server. Check that the backend is running on port 5000."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">✈</div>
          <h1>CorpRoute</h1>
          <p>Corporate Travel Management</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="login-form-group">
            <label htmlFor="email">Email or Username</label>
            <input
              id="email"
              type="text"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email or username"
              autoComplete="username"
              required
              disabled={loading}
            />
          </div>

          <div className="login-form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="login-error" role="alert">
              ❌ {error}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="register-login-link">
          <span>Don't have an account?</span>
          <button
            type="button"
            onClick={onRegister}
            disabled={loading}
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;