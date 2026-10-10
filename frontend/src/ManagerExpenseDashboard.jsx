import { useEffect, useState } from "react";
import API_URL from "./api";

function ManagerExpenseDashboard() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [filter, setFilter] = useState("All");

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("corproute-token") || ""}`,
  });

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/expenses`, {
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load expenses.");
      }

      setExpenses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(
        err.message || "Unable to load expenses. Check the backend connection."
      );
    } finally {
      setLoading(false);
    }
  };

  const updateExpenseStatus = async (expenseId, status) => {
    try {
      setUpdatingId(expenseId);
      setError("");

      const response = await fetch(
        `${API_URL}/api/expenses/${expenseId}/status`,
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
        throw new Error(data.message || "Failed to update expense status.");
      }

      setExpenses((previousExpenses) =>
        previousExpenses.map((expense) =>
          expense.id === expenseId ? { ...expense, status } : expense
        )
      );
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to update expense status.");
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const pendingExpenses = expenses.filter(
    (expense) => expense.status === "Pending"
  );

  const approvedExpenses = expenses.filter(
    (expense) => expense.status === "Approved"
  );

  const rejectedExpenses = expenses.filter(
    (expense) => expense.status === "Rejected"
  );

  const totalAmount = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );

  const pendingAmount = pendingExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );

  const approvedAmount = approvedExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );

  const filteredExpenses =
    filter === "All"
      ? expenses
      : expenses.filter((expense) => expense.status === filter);

  const formatAmount = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const formatDate = (date) => {
    if (!date) return "N/A";

    const parsedDate = new Date(date);

    return Number.isNaN(parsedDate.getTime())
      ? "N/A"
      : parsedDate.toLocaleDateString("en-IN");
  };

  return (
    <div className="manager-dashboard-page">
      <div className="page-header">
        <div>
          <span className="page-label">MANAGER</span>
          <h1>Expense Management</h1>
          <p>Review employee expenses and manage reimbursement approvals.</p>
        </div>

        <button
          type="button"
          className="refresh-btn"
          onClick={fetchExpenses}
          disabled={loading}
        >
          🔄 Refresh
        </button>
      </div>

      {error && <div className="error-message">❌ {error}</div>}

      <div className="dashboard-section">
        <div className="section-heading">
          <div>
            <span className="page-label">OVERVIEW</span>
            <h2>Expense Summary</h2>
          </div>
        </div>

        <div className="expense-stats">
          <StatCard
            icon="💰"
            label="Total Expenses"
            value={formatAmount(totalAmount)}
            description={`${expenses.length} expense requests`}
          />

          <StatCard
            icon="⏳"
            label="Pending"
            value={formatAmount(pendingAmount)}
            description={`${pendingExpenses.length} awaiting approval`}
          />

          <StatCard
            icon="✅"
            label="Approved"
            value={formatAmount(approvedAmount)}
            description={`${approvedExpenses.length} approved`}
          />

          <StatCard
            icon="❌"
            label="Rejected"
            value={rejectedExpenses.length}
            description="Rejected requests"
          />
        </div>
      </div>

      <div className="dashboard-section">
        <div className="section-heading">
          <div>
            <span className="page-label">REVIEW</span>
            <h2>Employee Expense Requests</h2>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            marginBottom: "22px",
          }}
        >
          {["All", "Pending", "Approved", "Rejected"].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(status)}
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                border: "1px solid #dbe2ea",
                background: filter === status ? "#3158c9" : "#ffffff",
                color: filter === status ? "#ffffff" : "#334155",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              {status}
              {status === "All"
                ? ` (${expenses.length})`
                : ` (${
                    expenses.filter((expense) => expense.status === status)
                      .length
                  })`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="empty-state">
            <h2>Loading expenses...</h2>
            <p>Please wait while we fetch expense requests.</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🧾</div>
            <h2>No expense requests found</h2>
            <p>Expense requests matching this filter will appear here.</p>
          </div>
        ) : (
          <div className="manager-request-list">
            {filteredExpenses.map((expense) => {
              const status = expense.status || "Pending";
              const isPending = status.toLowerCase() === "pending";
              const isUpdating = updatingId === expense.id;

              return (
                <div
                  className="manager-request-card"
                  key={expense.id}
                  style={{
                    background: "#ffffff",
                    borderRadius: "16px",
                    padding: "24px",
                    marginBottom: "18px",
                    boxShadow: "0 4px 18px rgba(15, 23, 42, 0.07)",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div
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
                        {expense.category ||
                          expense.expenseType ||
                          "Employee Expense"}
                      </span>

                      <h2 style={{ margin: "12px 0 8px" }}>
                        {expense.employeeName ||
                          expense.fullName ||
                          expense.username ||
                          "Employee"}
                      </h2>

                      <p style={{ margin: 0, color: "#64748b" }}>
                        {expense.description ||
                          expense.purpose ||
                          "No description provided"}
                      </p>
                    </div>

                    <span
                      className={`expense-status ${status.toLowerCase()}`}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "20px",
                        fontWeight: "600",
                        background:
                          status === "Approved"
                            ? "#dcfce7"
                            : status === "Rejected"
                              ? "#fee2e2"
                              : "#fef3c7",
                        color:
                          status === "Approved"
                            ? "#166534"
                            : status === "Rejected"
                              ? "#991b1b"
                              : "#92400e",
                      }}
                    >
                      {status}
                    </span>
                  </div>

                  <div
                    className="request-details"
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(130px, 1fr))",
                      gap: "18px",
                      marginTop: "24px",
                      paddingTop: "20px",
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    <Detail
                      label="Amount"
                      value={formatAmount(expense.amount)}
                    />

                    <Detail
                      label="Expense Date"
                      value={formatDate(
                        expense.expenseDate ||
                          expense.date ||
                          expense.createdAt
                      )}
                    />

                    <Detail
                      label="Request ID"
                      value={`#${String(expense.id || "").slice(0, 8) || "N/A"}`}
                    />
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
                        onClick={() =>
                          updateExpenseStatus(expense.id, "Approved")
                        }
                        style={buttonStyle("#16a34a", isUpdating)}
                      >
                        {isUpdating ? "Updating..." : "✅ Approve"}
                      </button>

                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() =>
                          updateExpenseStatus(expense.id, "Rejected")
                        }
                        style={buttonStyle("#dc2626", isUpdating)}
                      >
                        {isUpdating ? "Updating..." : "❌ Reject"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
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

function Detail({ label, value }) {
  return (
    <div>
      <span style={{ color: "#64748b", display: "block" }}>{label}</span>
      <strong>{value}</strong>
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

export default ManagerExpenseDashboard;