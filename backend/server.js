require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be configured with at least 32 characters in .env");
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "corproute",
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
});

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const allowedStatuses = ["Pending", "Approved", "Rejected"];
const allowedCategories = ["Flight", "Hotel", "Food", "Transport", "Other"];

// =====================================================
// HELPERS
// =====================================================

function dateOnly(value) {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

function timestamp(value) {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  return String(value).replace(" ", "T");
}

function mapUser(row) {
  return {
    id: row.uuid || String(row.id),
    fullName: row.full_name || row.name,
    username: row.username,
    email: row.email,
    role: row.role,
    createdAt: timestamp(row.created_at),
  };
}

function mapRequest(row) {
  return {
    id: row.uuid || String(row.id),
    employeeName: row.employee_name || "",
    destination: row.destination,
    purpose: row.purpose,
    departureDate: dateOnly(row.departure_date),
    returnDate: dateOnly(row.return_date),
    budget: Number(row.budget),
    status: row.status,
    createdAt: timestamp(row.created_at),
  };
}

function mapExpense(row) {
  return {
    id: row.uuid || String(row.id),
    travelRequestId: row.travel_request_uuid || "",
    employeeName: row.employee_name || "",
    destination: row.destination || "",
    category: row.category || "Other",
    amount: Number(row.amount),
    expenseDate: dateOnly(row.expense_date),
    description: row.description || "",
    status: row.status,
    createdAt: timestamp(row.created_at),
  };
}

async function findUserIdByName(connection, name) {
  const [rows] = await connection.execute(
    `SELECT id FROM users
     WHERE LOWER(full_name) = LOWER(?)
        OR LOWER(name) = LOWER(?)
     LIMIT 1`,
    [name || "", name || ""]
  );

  return rows[0]?.id ?? null;
}

async function findTravelRequest(connection, requestId) {
  const [rows] = await connection.execute(
    `SELECT * FROM travel_requests
     WHERE uuid = ? OR CAST(id AS CHAR) = ?
     LIMIT 1`,
    [String(requestId), String(requestId)]
  );

  return rows[0] || null;
}

// =====================================================
// JWT AUTHENTICATION
// =====================================================

function authenticateToken(req, res, next) {
  const authorization = req.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      message: "Please log in to perform this action.",
    });
  }

  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    return next();
  } catch (error) {
    return res.status(401).json({
      message: "Your session is invalid or expired. Please log in again.",
    });
  }
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({
        message: "You do not have permission to perform this action.",
      });
    }

    return next();
  };
}

// =====================================================
// HOME
// =====================================================

app.get("/", (req, res) => {
  res.send("CorpRoute Backend is Running!");
});

// =====================================================
// REGISTER
// =====================================================

app.post("/api/register", async (req, res) => {
  try {
    const { fullName, username, email, password, role } = req.body;

    if (
      typeof fullName !== "string" || !fullName.trim() ||
      typeof username !== "string" || !username.trim() ||
      typeof email !== "string" || !email.trim() ||
      typeof password !== "string" || !password
    ) {
      return res.status(400).json({
        message: "Please fill in all required fields.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must contain at least 6 characters.",
      });
    }

    if (role && String(role).toLowerCase() !== "employee") {
      return res.status(403).json({
        message: "Manager accounts must be created through a trusted administrative process.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();

    const [existing] = await pool.execute(
      `SELECT id FROM users
       WHERE LOWER(email) = ? OR LOWER(username) = ?
       LIMIT 1`,
      [normalizedEmail, normalizedUsername.toLowerCase()]
    );

    if (existing.length) {
      return res.status(409).json({
        message: "Username or email is already registered.",
      });
    }

    const id = randomUUID();
    const cleanName = fullName.trim();
    const hashedPassword = await bcrypt.hash(password, 12);

    await pool.execute(
      `INSERT INTO users
       (uuid, full_name, username, name, email, password, role)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        cleanName,
        normalizedUsername,
        cleanName,
        normalizedEmail,
        hashedPassword,
        "employee",
      ]
    );

    return res.status(201).json({
      message: "Account created successfully.",
      user: {
        id,
        fullName: cleanName,
        username: normalizedUsername,
        email: normalizedEmail,
        role: "employee",
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      message: "Unable to create account.",
    });
  }
});

// =====================================================
// LOGIN — RETURNS BOTH TOKEN AND USER
// =====================================================

app.post("/api/login", async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const rawIdentifier = email || username || "";

    if (
      typeof rawIdentifier !== "string" ||
      !rawIdentifier.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        message: "Email/username and password are required.",
      });
    }

    const identifier = rawIdentifier.trim().toLowerCase();

    const [rows] = await pool.execute(
      `SELECT * FROM users
       WHERE LOWER(email) = ? OR LOWER(username) = ?
       LIMIT 1`,
      [identifier, identifier]
    );

    const user = rows[0];

    if (!user) {
      return res.status(401).json({
        message: "Invalid email/username or password.",
      });
    }

    const storedPassword = String(user.password || "");
    let passwordMatches = false;

    if (storedPassword.startsWith("$2")) {
      passwordMatches = await bcrypt.compare(password, storedPassword);
    } else {
      // Upgrade an existing plain-text password to a bcrypt hash.
      passwordMatches = storedPassword === password;

      if (passwordMatches) {
        const hashedPassword = await bcrypt.hash(password, 12);

        await pool.execute(
          "UPDATE users SET password = ? WHERE id = ?",
          [hashedPassword, user.id]
        );
      }
    }

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email/username or password.",
      });
    }

    const token = jwt.sign(
      {
        id: user.uuid || String(user.id),
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        algorithm: "HS256",
        expiresIn: "2h",
      }
    );

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: mapUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Unable to login.",
    });
  }
});

// =====================================================
// GET TRAVEL REQUESTS
// =====================================================

app.get("/api/travel-requests", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM travel_requests ORDER BY id DESC"
    );

    return res.json(rows.map(mapRequest));
  } catch (error) {
    console.error("Fetch travel requests error:", error);

    return res.status(500).json({
      message: "Unable to fetch travel requests.",
    });
  }
});

// =====================================================
// CREATE TRAVEL REQUEST
// =====================================================

app.post("/api/travel-requests", async (req, res) => {
  const {
    employeeName,
    destination,
    purpose,
    departureDate,
    returnDate,
    budget,
  } = req.body;

  if (
    !employeeName || !destination || !purpose ||
    !departureDate || !returnDate ||
    budget === undefined || budget === null || budget === ""
  ) {
    return res.status(400).json({
      message: "Please fill in all fields.",
    });
  }

  if (
    Number.isNaN(Date.parse(departureDate)) ||
    Number.isNaN(Date.parse(returnDate))
  ) {
    return res.status(400).json({
      message: "Please enter valid travel dates.",
    });
  }

  if (dateOnly(departureDate) > dateOnly(returnDate)) {
    return res.status(400).json({
      message: "Return date must be after departure date.",
    });
  }

  if (!Number.isFinite(Number(budget)) || Number(budget) <= 0) {
    return res.status(400).json({
      message: "Budget must be greater than zero.",
    });
  }

  try {
    const id = randomUUID();
    const userId = await findUserIdByName(pool, employeeName);

    await pool.execute(
      `INSERT INTO travel_requests
       (uuid, user_id, employee_name, destination, purpose,
        departure_date, return_date, budget, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [
        id,
        userId,
        employeeName,
        destination,
        purpose,
        dateOnly(departureDate),
        dateOnly(returnDate),
        Number(budget),
      ]
    );

    const [rows] = await pool.execute(
      "SELECT * FROM travel_requests WHERE uuid = ?",
      [id]
    );

    return res.status(201).json({
      message: "Travel request submitted successfully.",
      request: mapRequest(rows[0]),
    });
  } catch (error) {
    console.error("Create travel request error:", error);

    return res.status(500).json({
      message: "Unable to submit travel request.",
    });
  }
});

// =====================================================
// APPROVE / REJECT TRAVEL REQUEST — MANAGER ONLY
// =====================================================

app.put(
  "/api/travel-requests/:id/status",
  authenticateToken,
  allowRoles("manager"),
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status.",
      });
    }

    try {
      const existing = await findTravelRequest(pool, id);

      if (!existing) {
        return res.status(404).json({
          message: "Travel request not found.",
        });
      }

      await pool.execute(
        "UPDATE travel_requests SET status = ? WHERE id = ?",
        [status, existing.id]
      );

      const [rows] = await pool.execute(
        "SELECT * FROM travel_requests WHERE id = ?",
        [existing.id]
      );

      return res.json({
        message: `Request ${status.toLowerCase()} successfully.`,
        request: mapRequest(rows[0]),
      });
    } catch (error) {
      console.error("Update travel request error:", error);

      return res.status(500).json({
        message: "Unable to update request status.",
      });
    }
  }
);

// =====================================================
// GET EXPENSES
// =====================================================

app.get("/api/expenses", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT e.*, tr.uuid AS travel_request_uuid
       FROM expenses e
       LEFT JOIN travel_requests tr ON tr.id = e.travel_request_id
       ORDER BY e.id DESC`
    );

    return res.json(rows.map(mapExpense));
  } catch (error) {
    console.error("Fetch expenses error:", error);

    return res.status(500).json({
      message: "Unable to fetch expenses.",
    });
  }
});

// =====================================================
// CREATE EXPENSE
// =====================================================

app.post("/api/expenses", async (req, res) => {
  const {
    travelRequestId,
    employeeName,
    destination,
    category,
    amount,
    expenseDate,
    description,
  } = req.body;

  if (
    !travelRequestId || !employeeName || !destination || !category ||
    amount === undefined || amount === null || amount === "" ||
    !expenseDate || !description
  ) {
    return res.status(400).json({
      message: "Please fill in all expense fields.",
    });
  }

  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({
      message: "Expense amount must be greater than zero.",
    });
  }

  if (!allowedCategories.includes(category)) {
    return res.status(400).json({
      message: "Invalid expense category.",
    });
  }

  if (Number.isNaN(Date.parse(expenseDate))) {
    return res.status(400).json({
      message: "Please enter a valid expense date.",
    });
  }

  try {
    const travelRequest = await findTravelRequest(pool, travelRequestId);

    if (!travelRequest) {
      return res.status(404).json({
        message: "Travel request not found.",
      });
    }

    if (travelRequest.status !== "Approved") {
      return res.status(400).json({
        message: "Expenses can only be added for approved travel requests.",
      });
    }

    const userId = await findUserIdByName(pool, employeeName);
    const id = randomUUID();

    await pool.execute(
      `INSERT INTO expenses
       (uuid, user_id, travel_request_id, employee_name, destination,
        category, amount, expense_date, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [
        id,
        userId,
        travelRequest.id,
        employeeName,
        destination,
        category,
        Number(amount),
        dateOnly(expenseDate),
        description,
      ]
    );

    const [rows] = await pool.execute(
      `SELECT e.*, tr.uuid AS travel_request_uuid
       FROM expenses e
       LEFT JOIN travel_requests tr ON tr.id = e.travel_request_id
       WHERE e.uuid = ?`,
      [id]
    );

    return res.status(201).json({
      message: "Expense submitted successfully.",
      expense: mapExpense(rows[0]),
    });
  } catch (error) {
    console.error("Create expense error:", error);

    return res.status(500).json({
      message: "Unable to submit expense.",
    });
  }
});

// =====================================================
// APPROVE / REJECT EXPENSE — MANAGER ONLY
// =====================================================

app.put(
  "/api/expenses/:id/status",
  authenticateToken,
  allowRoles("manager"),
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid expense status.",
      });
    }

    try {
      const [existingRows] = await pool.execute(
        `SELECT id FROM expenses
         WHERE uuid = ? OR CAST(id AS CHAR) = ?
         LIMIT 1`,
        [String(id), String(id)]
      );

      if (!existingRows.length) {
        return res.status(404).json({
          message: "Expense not found.",
        });
      }

      const expenseId = existingRows[0].id;

      await pool.execute(
        "UPDATE expenses SET status = ? WHERE id = ?",
        [status, expenseId]
      );

      const [rows] = await pool.execute(
        `SELECT e.*, tr.uuid AS travel_request_uuid
         FROM expenses e
         LEFT JOIN travel_requests tr ON tr.id = e.travel_request_id
         WHERE e.id = ?`,
        [expenseId]
      );

      return res.json({
        message: `Expense ${status.toLowerCase()} successfully.`,
        expense: mapExpense(rows[0]),
      });
    } catch (error) {
      console.error("Update expense status error:", error);

      return res.status(500).json({
        message: "Unable to update expense status.",
      });
    }
  }
);

// =====================================================
// START SERVER
// =====================================================

async function startServer() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    app.listen(PORT, "0.0.0.0", () => {
      console.log("MySQL connected successfully.");
      console.log(`CorpRoute backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Could not connect to MySQL:", error.message);
    process.exit(1);
  }
}

startServer();