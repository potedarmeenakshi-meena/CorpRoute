
import { useEffect, useState } from "react";
import API_URL from "./api";

function EmployeeDashboard({ userRole = "employee" }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const isManager =
    String(userRole).toLowerCase() === "manager";

  // Fetch travel requests
  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/travel-requests`
      );

      if (!response.ok) {
        throw new Error("Unable to fetch travel requests");
      }

      const data = await response.json();
      setRequests(data);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(
        "Unable to connect to the backend. Please check your server."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Approve or reject a travel request
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
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to update request status"
        );
      }

      setRequests((previousRequests) =>
        previousRequests.map((request) =>
          request.id === requestId
            ? { ...request, status }
            : request
        )
      );
    } catch (err) {
      console.error("Status update error:", err);
      setError(
        err.message || "Unable to update request status"
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // Request statistics
  const totalRequests = requests.length;

  const pendingRequests = requests.filter(
    (request) =>
      String(request.status || "Pending").toLowerCase() ===
      "pending"
  ).length;

  const approvedRequests = requests.filter(
    (request) => request.status === "Approved"
  ).length;

  const rejectedRequests = requests.filter(
    (request) => request.status === "Rejected"
  ).length;

  // Status styling
  const getStatusClass = (status) => {
    if (status === "Approved") return "status-approved";
    if (status === "Rejected") return "status-rejected";
    return "status-pending";
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return "Not specified";

    const formattedDate = new Date(date);

    if (Number.isNaN(formattedDate.getTime())) {
      return date;
    }

    return formattedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="employee-dashboard">
      {/* HEADER */}
      <div className="dashboard-header">
        <div>
          <h1>
            {isManager
              ? "All Travel Requests ✈️"
              : "My Travel Requests ✈️"}
          </h1>

          <p>
            {isManager
              ? "Review employee travel requests and approve or reject them."
              : "Track your corporate travel requests and approval status."}
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={fetchRequests}
          disabled={loading}
        >
          🔄 {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="dashboard-error" role="alert">
          <div className="error-icon">⚠️</div>
          <h3>Notice</h3>
          <p>{error}</p>

          <button
            className="retry-button"
            onClick={fetchRequests}
          >
            Try Again
          </button>
        </div>
      )}

      {/* STATISTICS */}
      {!loading && !error && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div>
              <p>Total Requests</p>
              <h2>{totalRequests}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon pending-icon">⏳</div>
            <div>
              <p>Pending</p>
              <h2>{pendingRequests}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon approved-icon">✅</div>
            <div>
              <p>Approved</p>
              <h2>{approvedRequests}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon rejected-icon">❌</div>
            <div>
              <p>Rejected</p>
              <h2>{rejectedRequests}</h2>
            </div>
          </div>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="dashboard-message">
          <div className="loading-spinner"></div>
          <p>Loading travel requests...</p>
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && !error && requests.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">✈️</div>
          <h3>No Travel Requests Yet</h3>
          <p>
            No travel requests have been submitted yet.
          </p>
        </div>
      )}

      {/* REQUESTS */}
      {!loading && !error && requests.length > 0 && (
        <div className="requests-section">
          <div className="section-heading">
            <div>
              <h2>
                {isManager
                  ? "Employee Travel Requests"
                  : "Travel Request History"}
              </h2>

              <p>
                {isManager
                  ? "Review requests and take action on pending trips."
                  : "View your submitted travel requests and their current status."}
              </p>
            </div>

            <span className="request-count">
              {totalRequests} Request
              {totalRequests !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="request-grid">
            {requests.map((request) => {
              const status = request.status || "Pending";

              const isPending =
                status.toLowerCase() === "pending";

              const isUpdating =
                updatingId === request.id;

              return (
                <div
                  className="request-card"
                  key={request.id}
                >
                  {/* CARD HEADER */}
                  <div className="request-card-header">
                    <div>
                      <span className="request-label">
                        Travel Request
                      </span>

                      <h3>{request.destination}</h3>
                    </div>

                    <span
                      className={`status-badge ${getStatusClass(status)}`}
                    >
                      {status === "Approved" && "✓ "}
                      {status === "Rejected" && "✕ "}
                      {isPending && "● "}
                      {status}
                    </span>
                  </div>

                  {/* REQUEST ID */}
                  <div className="request-id">
                    Request ID:{" "}
                    <strong>{request.id}</strong>
                  </div>

                  {/* REQUEST DETAILS */}
                  <div className="request-details">
                    <div className="detail-item">
                      <span className="detail-icon">👤</span>
                      <div>
                        <small>Employee</small>
                        <strong>
                          {request.employeeName}
                        </strong>
                      </div>
                    </div>

                    <div className="detail-item">
                      <span className="detail-icon">🎯</span>
                      <div>
                        <small>Purpose</small>
                        <strong>{request.purpose}</strong>
                      </div>
                    </div>

                    <div className="detail-item">
                      <span className="detail-icon">📅</span>
                      <div>
                        <small>Departure</small>
                        <strong>
                          {formatDate(request.departureDate)}
                        </strong>
                      </div>
                    </div>

                    <div className="detail-item">
                      <span className="detail-icon">🏠</span>
                      <div>
                        <small>Return</small>
                        <strong>
                          {formatDate(request.returnDate)}
                        </strong>
                      </div>
                    </div>

                    <div className="detail-item budget-item">
                      <span className="detail-icon">💰</span>
                      <div>
                        <small>Estimated Budget</small>
                        <strong>
                          ₹
                          {Number(
                            request.budget || 0
                          ).toLocaleString("en-IN")}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* MANAGER APPROVAL BUTTONS */}
                  {isManager && isPending && (
                    <div
                      className="request-actions"
                      style={{
                        display: "flex",
                        gap: "12px",
                        marginTop: "24px",
                        paddingTop: "18px",
                        borderTop: "1px solid #e5e7eb",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() =>
                          updateRequestStatus(
                            request.id,
                            "Approved"
                          )
                        }
                        style={{
                          backgroundColor: "#16a34a",
                          color: "#ffffff",
                          border: "none",
                          padding: "12px 22px",
                          borderRadius: "8px",
                          cursor: isUpdating
                            ? "not-allowed"
                            : "pointer",
                          fontWeight: "600",
                          fontSize: "15px",
                          opacity: isUpdating ? 0.6 : 1,
                        }}
                      >
                        {isUpdating
                          ? "Updating..."
                          : "✅ Approve"}
                      </button>

                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() =>
                          updateRequestStatus(
                            request.id,
                            "Rejected"
                          )
                        }
                        style={{
                          backgroundColor: "#dc2626",
                          color: "#ffffff",
                          border: "none",
                          padding: "12px 22px",
                          borderRadius: "8px",
                          cursor: isUpdating
                            ? "not-allowed"
                            : "pointer",
                          fontWeight: "600",
                          fontSize: "15px",
                          opacity: isUpdating ? 0.6 : 1,
                        }}
                      >
                        {isUpdating
                          ? "Updating..."
                          : "❌ Reject"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeeDashboard;
