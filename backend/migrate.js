
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: process.env.DB_PASSWORD,
  database: "corproute",
  waitForConnections: true,
  connectionLimit: 5,
});

const dataDir = path.join(__dirname, "data");

function readJson(filename) {
  const filePath = path.join(dataDir, filename);

  if (!fs.existsSync(filePath)) return [];

  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return Array.isArray(parsed) ? parsed : [];
}

function asDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function asTimestamp(value) {
  if (!value) return new Date();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

async function migrate() {
  const users = readJson("users.json");
  const requests = readJson("travelRequests.json");
  const expenses = readJson("expenses.json");

  console.log("Records found:", {
    users: users.length,
    travelRequests: requests.length,
    expenses: expenses.length,
  });

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Keep existing UUIDs as the application's stable identifiers.
    for (const user of users) {
      await connection.execute(
        `INSERT INTO users
          (uuid, full_name, username, name, email, password, role, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           full_name = VALUES(full_name),
           username = VALUES(username),
           name = VALUES(name),
           email = VALUES(email),
           password = VALUES(password),
           role = VALUES(role)`,
        [
          String(user.id),
          user.fullName || user.name || user.username || "Unknown",
          user.username || null,
          user.fullName || user.name || user.username || "Unknown",
          user.email,
          user.password,
          user.role || "employee",
          asTimestamp(user.createdAt),
        ]
      );
    }

    // Resolve each existing employee name to a user when possible.
    for (const request of requests) {
      const [matchedUsers] = await connection.execute(
        `SELECT id FROM users
         WHERE full_name = ? OR name = ?
         LIMIT 1`,
        [request.employeeName || "", request.employeeName || ""]
      );

      await connection.execute(
        `INSERT INTO travel_requests
          (uuid, user_id, employee_name, destination, purpose,
           departure_date, return_date, budget, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           employee_name = VALUES(employee_name),
           destination = VALUES(destination),
           purpose = VALUES(purpose),
           departure_date = VALUES(departure_date),
           return_date = VALUES(return_date),
           budget = VALUES(budget),
           status = VALUES(status)`,
        [
          String(request.id),
          matchedUsers[0]?.id ?? null,
          request.employeeName || "Unknown",
          request.destination || "Unknown",
          request.purpose || "",
          asDate(request.departureDate),
          asDate(request.returnDate),
          Number(request.budget) || 0,
          ["Pending", "Approved", "Rejected"].includes(request.status)
            ? request.status
            : "Pending",
          asTimestamp(request.createdAt),
        ]
      );
    }

    for (const expense of expenses) {
      const [matchedUsers] = await connection.execute(
        `SELECT id FROM users
         WHERE full_name = ? OR name = ?
         LIMIT 1`,
        [expense.employeeName || "", expense.employeeName || ""]
      );

      const [matchedRequests] = await connection.execute(
        `SELECT id FROM travel_requests WHERE uuid = ? LIMIT 1`,
        [String(expense.travelRequestId || "") ]
      );

      await connection.execute(
        `INSERT INTO expenses
          (uuid, user_id, travel_request_id, employee_name, destination,
           category, amount, expense_date, description, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           employee_name = VALUES(employee_name),
           destination = VALUES(destination),
           category = VALUES(category),
           amount = VALUES(amount),
           expense_date = VALUES(expense_date),
           description = VALUES(description),
           status = VALUES(status)`,
        [
          String(expense.id),
          matchedUsers[0]?.id ?? null,
          matchedRequests[0]?.id ?? null,
          expense.employeeName || "Unknown",
          expense.destination || "Unknown",
          expense.category || "Other",
          Number(expense.amount) || 0,
          asDate(expense.expenseDate),
          expense.description || "",
          ["Pending", "Approved", "Rejected"].includes(expense.status)
            ? expense.status
            : "Pending",
          asTimestamp(expense.createdAt),
        ]
      );
    }

    await connection.commit();

    console.log("Migration completed successfully.");
  } catch (error) {
    await connection.rollback();
    console.error("Migration failed; transaction rolled back:", error.message);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error("Migration could not start:", error.message);
  process.exitCode = 1;
});
