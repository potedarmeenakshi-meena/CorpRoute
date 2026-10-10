import { useState, useEffect } from "react";
import Login from "./Login.jsx";
import Register from "./Register.jsx";
import EmployeeDashboard from "./EmployeeDashboard";
import ManagerDashboard from "./ManagerDashboard";
import ExpenseDashboard from "./ExpenseDashboard";
import ManagerExpenseDashboard from "./ManagerExpenseDashboard";
import API_URL from "./api";
import "./App.css";

function App() {
  // LIGHT / DARK MODE
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("corproute-theme") === "dark"
        ? "dark"
        : "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);

    try {
      localStorage.setItem("corproute-theme", theme);
    } catch {
      // Theme remains active for this session.
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  };

  const themeToggle = (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
    </button>
  );

  // AUTHENTICATION
  const [user, setUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);

  const userRole = String(user?.role || "employee").toLowerCase();

  const employeeDisplayName =
    user?.fullName ||
    user?.username ||
    user?.name ||
    user?.email ||
    "Employee";

  // PAGE NAVIGATION
  const [activePage, setActivePage] = useState("home");

  // TRAVEL REQUEST FORM
  const [formData, setFormData] = useState({
    destination: "",
    purpose: "",
    departureDate: "",
    returnDate: "",
    budget: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // LOGIN
  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    setShowRegister(false);
    setActivePage("home");
    setMessage("");
    setError("");
    window.scrollTo(0, 0);
  };

  // LOGOUT
  const handleLogout = () => {
    localStorage.removeItem("corproute-token");

    setUser(null);
    setShowRegister(false);
    setActivePage("home");
    setFormData({
      destination: "",
      purpose: "",
      departureDate: "",
      returnDate: "",
      budget: "",
    });
    setMessage("");
    setError("");

    window.scrollTo(0, 0);
  };

  // NAVIGATION
  const navigateTo = (page) => {
    if (
      userRole !== "manager" &&
      (page === "manager" || page === "managerExpenses")
    ) {
      setError("You do not have permission to access this page.");
      return;
    }

    setActivePage(page);
    setMessage("");
    setError("");
    window.scrollTo(0, 0);
  };

  // NEW REQUEST
  const createNewRequest = () => {
    setFormData({
      destination: "",
      purpose: "",
      departureDate: "",
      returnDate: "",
      budget: "",
    });

    setMessage("");
    setError("");
    setActivePage("employee");
    window.scrollTo(0, 0);
  };

  // FORM INPUT CHANGE
  const handleChange = (e) => {
    setFormData((current) => ({
      ...current,
      [e.target.name]: e.target.value,
    }));
  };

  // SUBMIT TRAVEL REQUEST
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    const token = localStorage.getItem("corproute-token");

    if (!token) {
      setError("Your session has expired. Please log in again.");
      handleLogout();
      return;
    }

    if (
      formData.returnDate &&
      formData.departureDate &&
      formData.returnDate < formData.departureDate
    ) {
      setError("Return date cannot be earlier than departure date.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/travel-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          employeeName: employeeDisplayName,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        setError(
          data.message ||
            "Your session is invalid or you are not authorized. Please log in again."
        );
        return;
      }

      if (!response.ok) {
        setError(data.message || "Unable to create the travel request.");
        return;
      }

      setMessage(
        `Travel request created successfully! Request ID: ${
          data.id || data.request?.id || "Created"
        }`
      );

      setFormData({
        destination: "",
        purpose: "",
        departureDate: "",
        returnDate: "",
        budget: "",
      });
    } catch (err) {
      console.error("Travel request error:", err);
      setError(
        "Unable to connect to the server. Make sure the backend is running."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // LOGIN / REGISTER SCREEN
  if (!user) {
    return (
      <div className="auth-theme-shell">
        {themeToggle}

        {showRegister ? (
          <Register onBackToLogin={() => setShowRegister(false)} />
        ) : (
          <Login
            onLogin={handleLogin}
            onRegister={() => setShowRegister(true)}
          />
        )}
      </div>
    );
  }

  // MAIN APPLICATION
  return (
    <div className="app-container">
      {themeToggle}

      {/* SIDEBAR */}
      <aside className="sidebar">
        {/* LOGO */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">✈</div>
          <h2>CorpRoute</h2>
        </div>

        {/* USER INFORMATION */}
        <div className="sidebar-user">
          <div className="sidebar-user-icon">
            {userRole === "manager" ? "👨‍💼" : "👤"}
          </div>

          <div>
            <strong>{employeeDisplayName}</strong>
            <span>{userRole === "manager" ? "Manager" : "Employee"}</span>
          </div>
        </div>

        {/* HOME */}
        <button
          className={activePage === "home" ? "active" : ""}
          onClick={() => navigateTo("home")}
        >
          🏠 Home
        </button>

        {/* EMPLOYEE FORM */}
        <button
          className={activePage === "employee" ? "active" : ""}
          onClick={() => navigateTo("employee")}
        >
          ✈️ Employee Form
        </button>

        {/* TRAVEL REQUESTS */}
        <button
          className={activePage === "employeeDashboard" ? "active" : ""}
          onClick={() => navigateTo("employeeDashboard")}
        >
          📋 {userRole === "manager" ? "All Travel Requests" : "My Travel Requests"}
        </button>

        {/* EXPENSES */}
        <button
          className={activePage === "expenses" ? "active" : ""}
          onClick={() => navigateTo("expenses")}
        >
          💰 Expenses
        </button>

        {/* MANAGER-ONLY EXPENSE APPROVALS */}
        {userRole === "manager" && (
          <button
            className={activePage === "managerExpenses" ? "active" : ""}
            onClick={() => navigateTo("managerExpenses")}
          >
            💳 Expense Approvals
          </button>
        )}

        {/* MANAGER-ONLY DASHBOARD */}
        {userRole === "manager" && (
          <button
            className={activePage === "manager" ? "active" : ""}
            onClick={() => navigateTo("manager")}
          >
            📊 Manager Dashboard
          </button>
        )}

        {/* NEW REQUEST */}
        <button onClick={createNewRequest}>📝 New Request</button>

        {/* LOGOUT */}
        <button className="logout-button" onClick={handleLogout}>
          🚪 Logout
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        {/* HOME PAGE */}
        {activePage === "home" && (
          <div className="simple-home">
            <div className="welcome-section">
              <h1>
                Welcome to <span>CorpRoute</span>
              </h1>

              <p>
                Your simple and efficient corporate travel management system.
              </p>

              <p className="home-description">
                Create travel requests, track approvals, and manage your
                business expenses in one place.
              </p>

              <div className="home-buttons">
                <button className="primary-btn" onClick={createNewRequest}>
                  📝 Create Travel Request
                </button>

                <button
                  className="secondary-btn"
                  onClick={() => navigateTo("employeeDashboard")}
                >
                  📋{" "}
                  {userRole === "manager"
                    ? "View Travel Requests"
                    : "My Travel Requests"}
                </button>
              </div>
            </div>

            {/* FEATURES */}
            <div className="simple-features">
              <div className="simple-feature">
                <h3>✈️ Travel Requests</h3>
                <p>Create and submit your business travel requests easily.</p>
              </div>

              <div className="simple-feature">
                <h3>📋 Track Requests</h3>
                <p>Check the status of your travel requests anytime.</p>
              </div>

              <div className="simple-feature">
                <h3>💰 Manage Expenses</h3>
                <p>Submit and manage expenses related to approved trips.</p>
              </div>
            </div>
          </div>
        )}

        {/* TRAVEL REQUEST FORM */}
        {activePage === "employee" && (
          <div className="page-container">
            <div className="page-header">
              <div>
                <span className="page-label">EMPLOYEE</span>
                <h1>Create Travel Request</h1>
                <p>Submit your business travel details for manager approval.</p>
              </div>
            </div>

            <div className="form-card">
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  {/* EMPLOYEE NAME: FROM LOGGED-IN USER */}
                  <div className="form-group">
                    <label>Employee Name</label>
                    <input
                      type="text"
                      name="employeeName"
                      value={employeeDisplayName}
                      readOnly
                      aria-readonly="true"
                    />
                  </div>

                  {/* DESTINATION */}
                  <div className="form-group">
                    <label>Destination</label>
                    <input
                      type="text"
                      name="destination"
                      value={formData.destination}
                      onChange={handleChange}
                      placeholder="e.g. Delhi"
                      required
                    />
                  </div>

                  {/* PURPOSE */}
                  <div className="form-group full-width">
                    <label>Purpose of Travel</label>
                    <textarea
                      name="purpose"
                      value={formData.purpose}
                      onChange={handleChange}
                      placeholder="Enter the purpose of your business trip"
                      rows="4"
                      required
                    />
                  </div>

                  {/* DEPARTURE DATE */}
                  <div className="form-group">
                    <label>Departure Date</label>
                    <input
                      type="date"
                      name="departureDate"
                      value={formData.departureDate}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  {/* RETURN DATE */}
                  <div className="form-group">
                    <label>Return Date</label>
                    <input
                      type="date"
                      name="returnDate"
                      value={formData.returnDate}
                      onChange={handleChange}
                      min={formData.departureDate || undefined}
                      required
                    />
                  </div>

                  {/* BUDGET */}
                  <div className="form-group">
                    <label>Estimated Budget (₹)</label>
                    <input
                      type="number"
                      name="budget"
                      value={formData.budget}
                      onChange={handleChange}
                      placeholder="Enter estimated budget"
                      min="1"
                      required
                    />
                  </div>
                </div>

                {/* SUCCESS MESSAGE */}
                {message && (
                  <div className="success-message">✅ {message}</div>
                )}

                {/* ERROR MESSAGE */}
                {error && <div className="error-message">❌ {error}</div>}

                <button
                  type="submit"
                  className="submit-btn"
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Submit Travel Request"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TRAVEL REQUESTS */}
        {activePage === "employeeDashboard" && (
          <EmployeeDashboard userRole={userRole} />
        )}

        {/* EMPLOYEE EXPENSES */}
        {activePage === "expenses" && <ExpenseDashboard />}

        {/* MANAGER EXPENSE APPROVALS */}
        {activePage === "managerExpenses" && userRole === "manager" && (
          <ManagerExpenseDashboard />
        )}

        {/* MANAGER DASHBOARD */}
        {activePage === "manager" && userRole === "manager" && (
          <ManagerDashboard />
        )}
      </main>
    </div>
  );
}

export default App;