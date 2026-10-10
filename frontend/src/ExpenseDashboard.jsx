import { useEffect, useState } from "react";
import API_URL from "./api";

function ExpenseDashboard() {
  const [requests, setRequests] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    travelRequestId: "",
    category: "",
    amount: "",
    expenseDate: "",
    description: "",
  });

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("corproute-token") || ""}`,
  });

  const fetchData = async () => {
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
        throw new Error("Unable to fetch expense information.");
      }

      const requestsData = await requestsResponse.json();
      const expensesData = await expensesResponse.json();

      setRequests(Array.isArray(requestsData) ? requestsData : []);
      setExpenses(Array.isArray(expensesData) ? expensesData : []);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(
        err.message ||
          "Unable to connect to the backend. Please check your server."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const approvedRequests = requests.filter(
    (request) => request.status === "Approved"
  );

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    const selectedRequest = approvedRequests.find(
      (request) => String(request.id) === String(formData.travelRequestId)
    );

    if (!selectedRequest) {
      setError("Please select an approved travel request.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(`${API_URL}/api/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          travelRequestId: selectedRequest.id,
          employeeName: selectedRequest.employeeName,
          destination: selectedRequest.destination,
          category: formData.category,
          amount: Number(formData.amount),
          expenseDate: formData.expenseDate,
          description: formData.description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to submit expense.");
      }

      setMessage("Expense submitted successfully!");

      setFormData({
        travelRequestId: "",
        category: "",
        amount: "",
        expenseDate: "",
        description: "",
      });

      await fetchData();
    } catch (err) {
      console.error("Expense submission error:", err);
      setError(err.message || "Unable to submit expense.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusClass = (status) => {
    if (status === "Approved") return "status-approved";
    if (status === "Rejected") return "status-rejected";
    return "status-pending";
  };

  if (loading) {
    return (
      <div className="manager-loading">
        <div className="loading-spinner"></div>
        <p>Loading expense information...</p>
      </div>
    );
  }

  return (
    <div className="expense-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Expense Management 💰</h1>
          <p>Submit and track your business travel expenses.</p>
        </div>

        <button
          type="button"
          className="refresh-button"
          onClick={fetchData}
          disabled={loading}
        >
          🔄 Refresh
        </button>
      </div>

      {error && <div className="error-message">❌ {error}</div>}
      {message && <div className="success-message">✅ {message}</div>}

      {approvedRequests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✈️</div>
          <h3>No Approved Trips</h3>
          <p>You can submit expenses only for approved travel requests.</p>
        </div>
      ) : (
        <div className="expense-form-card">
          <div className="expense-form-header">
            <div>
              <h2>Add Travel Expense</h2>
              <p>Submit an expense for an approved business trip.</p>
            </div>
            <span className="expense-icon">💳</span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="travelRequestId">
                Approved Travel Request
              </label>

              <select
                id="travelRequestId"
                name="travelRequestId"
                value={formData.travelRequestId}
                onChange={handleChange}
                required
              >
                <option value="">Select an approved trip</option>

                {approvedRequests.map((request) => (
                  <option key={request.id} value={request.id}>
                    {request.destination} — {request.employeeName}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="category">Expense Category</label>

              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="">Select category</option>
                <option value="Flight">✈️ Flight</option>
                <option value="Hotel">🏨 Hotel</option>
                <option value="Food">🍴 Food</option>
                <option value="Transport">🚕 Transport</option>
                <option value="Other">📦 Other</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="amount">Amount (₹)</label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  placeholder="Enter amount"
                  min="1"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="expenseDate">Expense Date</label>
                <input
                  type="date"
                  id="expenseDate"
                  name="expenseDate"
                  value={formData.expenseDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                placeholder="Describe the expense..."
                value={formData.description}
                onChange={handleChange}
                required
              />
            </div>

            <button
              type="submit"
              className="primary-button expense-submit-button"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "💰 Submit Expense"}
            </button>
          </form>
        </div>
      )}

      <div className="expense-history">
        <div className="section-heading">
          <div>
            <h2>Expense History</h2>
            <p>Track submitted expenses and reimbursement status.</p>
          </div>

          <span className="request-count">
            {expenses.length} Expense{expenses.length !== 1 ? "s" : ""}
          </span>
        </div>

        {expenses.length === 0 ? (
          <div className="expense-empty">
            <span>💳</span>
            <p>No expenses submitted yet.</p>
          </div>
        ) : (
          <div className="expense-grid">
            {expenses.map((expense) => (
              <div className="expense-card" key={expense.id}>
                <div className="expense-card-header">
                  <div>
                    <span className="request-label">
                      {expense.category || "Expense"}
                    </span>
                    <h3>{expense.destination || "Business expense"}</h3>
                  </div>

                  <span
                    className={`status-badge ${getStatusClass(
                      expense.status
                    )}`}
                  >
                    {expense.status || "Pending"}
                  </span>
                </div>

                <div className="expense-card-details">
                  <p>
                    <strong>Amount:</strong>{" "}
                    ₹{Number(expense.amount || 0).toLocaleString("en-IN")}
                  </p>

                  <p>
                    <strong>Date:</strong>{" "}
                    {expense.expenseDate
                      ? new Date(expense.expenseDate).toLocaleDateString(
                          "en-IN"
                        )
                      : "N/A"}
                  </p>

                  <p>
                    <strong>Description:</strong>{" "}
                    {expense.description || "No description"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ExpenseDashboard;