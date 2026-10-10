import { useEffect, useState } from "react";
import API_URL from "./api";

function ManagerDashboard() {
  const [requests, setRequests] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRequests, setShowRequests] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("corproute-token") || ""}`,
  });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const [requestsResponse, expensesResponse] = await Promise.all([
        fetch(`${API_URL}/api/travel-requests`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${API_URL}/api/expenses`, {
          headers: getAuthHeaders(),
        }),
      ]);

      if (!requestsResponse.ok || !expensesResponse.ok) {
        throw new Error("Failed to fetch dashboard data.");
      }

      const requestsData = await requestsResponse.json();
      const expensesData = await expensesResponse.json();

      setRequests(Array.isArray(requestsData) ? requestsData : []);
      setExpenses(Array.isArray(expensesData) ? expensesData : []);
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          "Unable to load dashboard data. Make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (requestId, status) => {
    try {
      setUpdatingId(requestId);
      setError("");

      const response = await fetch(
        `${API_URL}/api/travel-requests/${requestId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to update request status."
        );
      }

      setRequests((previous) =>
        previous.map((request) =>
          request.id === requestId ? { ...request, status } : request
        )
      );
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to update request status.");
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const pendingRequests = requests.filter(
    (request) =>
      String(request.status || "Pending").toLowerCase() === "pending"
  );

  const approvedRequests = requests.filter(
    (request) => request.status === "Approved"
  );

  const rejectedRequests = requests.filter(
    (request) => request.status === "Rejected"
  );

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );

  const pendingExpenses = expenses.filter(
    (expense) => expense.status === "Pending"
  );

  const approvedExpenses = expenses.filter(
    (expense) => expense.status === "Approved"
  );

  const rejectedExpenses = expenses.filter(
    (expense) => expense.status === "Rejected"
  );

  const approvedExpenseAmount = approvedExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );

  const pendingExpenseAmount = pendingExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );

  const recentRequests = [...requests]
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    )
    .slice(0, 5);

  const renderRequestCard = (request) => {
    const status = request.status || "Pending";
    const isPending = status.toLowerCase() === "pending";
    const isUpdating = updatingId === request.id;

    return (
      <div className="manager-request-card" key={request.id}>
        <div
          className="request-card-main"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <span className="expense-category">
              {request.destination || "Destination not provided"}
            </span>

            <h2 style={{ margin: "12px 0 8px" }}>
              {request.employeeName || "Employee"}
            </h2>

            <p style={{ margin: 0, color: "#64748b" }}>
              {request.purpose || "No purpose provided"}
            </p>
          </div>

          <span className={`expense-status ${status.toLowerCase()}`}>
            {status}
          </span>
        </div>

        <div className="request-details">
          <div>
            <span>Departure</span>
            <strong>
              {request.departureDate
                ? new Date(request.departureDate).toLocaleDateString()
                : "N/A"}
            </strong>
          </div>

          <div>
            <span>Return</span>
            <strong>
              {request.returnDate
                ? new Date(request.returnDate).toLocaleDateString()
                : "N/A"}
            </strong>
          </div>

          <div>
            <span>Budget</span>
            <strong>
              ₹{Number(request.budget || 0).toLocaleString("en-IN")}
            </strong>
          </div>

          <div>
            <span>Request ID</span>
            <strong>#{String(request.id || "").slice(0, 8) || "N/A"}</strong>
          </div>
        </div>

        {isPending && (
          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              marginTop: "24px",
              paddingTop: "18px",
              borderTop: "1px solid #e5e7eb",
            }}
          >
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => updateRequestStatus(request.id, "Approved")}
              style={buttonStyle("#16a34a", isUpdating)}
            >
              {isUpdating ? "Updating..." : "✅ Approve"}
            </button>

            <button
              type="button"
              disabled={isUpdating}
              onClick={() => updateRequestStatus(request.id, "Rejected")}
              style={buttonStyle("#dc2626", isUpdating)}
            >
              {isUpdating ? "Updating..." : "❌ Reject"}
            </button>
          </div>
        )}
      </div>
    );
  };

  if (showRequests) {
    return (
      <div className="manager-dashboard-page">
        <div className="page-header">
          <div>
            <span className="page-label">MANAGER</span>
            <h1>Travel Requests</h1>
            <p>Overview of employee travel requests.</p>
          </div>

          <button
            className="refresh-btn"
            onClick={fetchDashboardData}
            disabled={loading}
          >
            🔄 Refresh
          </button>
        </div>

        {error && <div className="error-message">❌ {error}</div>}

        <button
          type="button"
          onClick={() => setShowRequests(false)}
          style={{
            marginBottom: "20px",
            padding: "10px 16px",
            border: "none",
            borderRadius: "8px",
            background: "#eef2ff",
            color: "#3158c9",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          ← Back to Dashboard
        </button>

        {loading ? (
          <div className="empty-state">
            <h2>Loading travel requests...</h2>
          </div>
        ) : requests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h2>No travel requests yet</h2>
          </div>
        ) : (
          <div className="manager-request-list">
            {requests.map(renderRequestCard)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="manager-dashboard-page">
      <div className="page-header">
        <div>
          <span className="page-label">MANAGER</span>
          <h1>Manager Dashboard</h1>
          <p>
            Monitor travel requests, approvals, and employee expenses
            from one place.
          </p>
        </div>

        <button
          className="refresh-btn"
          onClick={fetchDashboardData}
          disabled={loading}
        >
          🔄 Refresh
        </button>
      </div>

      {error && <div className="error-message">❌ {error}</div>}

      {loading ? (
        <div className="empty-state">
          <h2>Loading dashboard...</h2>
          <p>Please wait while we fetch the latest data.</p>
        </div>
      ) : (
        <>
          <div className="dashboard-section">
            <div className="section-heading">
              <div>
                <span className="page-label">TRAVEL</span>
                <h2>Travel Request Overview</h2>
              </div>
            </div>

            <div className="expense-stats">
              <div
                className="expense-stat-card"
                onClick={() => setShowRequests(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    setShowRequests(true);
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                <div className="stat-icon">📋</div>
                <div>
                  <span>Total Requests</span>
                  <h2>{requests.length}</h2>
                  <small>Click to view requests</small>
                </div>
              </div>

              <StatCard
                icon="⏳"
                label="Pending"
                value={pendingRequests.length}
                description="Awaiting approval"
              />

              <StatCard
                icon="✅"
                label="Approved"
                value={approvedRequests.length}
                description="Approved trips"
              />

              <StatCard
                icon="❌"
                label="Rejected"
                value={rejectedRequests.length}
                description="Rejected requests"
              />
            </div>
          </div>

          <div className="dashboard-section">
            <div className="section-heading">
              <div>
                <span className="page-label">EXPENSES</span>
                <h2>Expense Overview</h2>
              </div>
            </div>

            <div className="expense-stats">
              <StatCard
                icon="💰"
                label="Total Expenses"
                value={`₹${totalExpenses.toLocaleString("en-IN")}`}
                description={`${expenses.length} expenses`}
              />

              <StatCard
                icon="⏳"
                label="Pending Amount"
                value={`₹${pendingExpenseAmount.toLocaleString("en-IN")}`}
                description={`${pendingExpenses.length} pending`}
              />

              <StatCard
                icon="✅"
                label="Approved Amount"
                value={`₹${approvedExpenseAmount.toLocaleString("en-IN")}`}
                description={`${approvedExpenses.length} approved`}
              />

              <StatCard
                icon="📊"
                label="Expense Requests"
                value={expenses.length}
                description={`${rejectedExpenses.length} rejected`}
              />
            </div>
          </div>

          <div className="dashboard-section">
            <div className="section-heading">
              <div>
                <span className="page-label">RECENT ACTIVITY</span>
                <h2>Recent Travel Requests</h2>
              </div>
            </div>

            {recentRequests.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h2>No travel requests yet</h2>
                <p>Travel requests submitted by employees appear here.</p>
              </div>
            ) : (
              <div className="manager-request-list">
                {recentRequests.map(renderRequestCard)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, description }) {
  return (
    <div className="expense-stat-card">
      <div className="stat-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <h2>{value}</h2>
        <small>{description}</small>
      </div>
    </div>
  );
}

function buttonStyle(background, disabled) {
  return {
    background,
    color: "#ffffff",
    border: "none",
    padding: "12px 22px",
    borderRadius: "8px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: "600",
    fontSize: "15px",
    opacity: disabled ? 0.6 : 1,
  };
}

export default ManagerDashboard;