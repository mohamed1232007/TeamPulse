const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const db = require("./database/db");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET =
    process.env.JWT_SECRET || "team_pulse_super_secret_jwt_key_2026";

app.use(
    cors({
        origin: true,
        credentials: true,
    }),
);

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
    res.send("🚀 TeamPulse Backend is running on Vercel!");
});

const verifyToken = (req, res, next) => {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization) {
        const parts = req.headers.authorization.split(" ");
        if (parts.length === 2 && parts[0] === "Bearer") {
            token = parts[1];
        }
    }

    if (!token) {
        return res
            .status(401)
            .json({ message: "Unauthorized: Please login first" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        return res
            .status(401)
            .json({ message: "Session expired, please login again" });
    }
};

const requireAdmin = (req, res, next) => {
    if (req.user?.role !== "admin") {
        return res
            .status(403)
            .json({ message: "Forbidden: Admin privileges required" });
    }
    next();
};

app.post("/api/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res
                .status(400)
                .json({ message: "Please fill in all required fields" });
        }

        const trimmedEmail = email.trim().toLowerCase();
        const trimmedName = name.trim();

        if (password.length < 6) {
            return res
                .status(400)
                .json({ message: "Password must be at least 6 characters" });
        }

        const [existingUsers] = await db.query(
            "SELECT UserID FROM users WHERE email = ?",
            [trimmedEmail],
        );
        if (existingUsers.length > 0) {
            return res
                .status(400)
                .json({ message: "This email is already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = crypto.randomUUID();
        const role = trimmedEmail === "mohamed@gmail.com" ? "admin" : "user";

        await db.query(
            "INSERT INTO users (UserID, name, email, password, role) VALUES (?, ?, ?, ?, ?)",
            [userId, trimmedName, trimmedEmail, hashedPassword, role],
        );

        res.status(201).json({
            message: "Account created successfully! Please login.",
            user: {
                id: userId,
                name: trimmedName,
                email: trimmedEmail,
                role: role,
            },
        });
    } catch (err) {
        console.error("Register Error:", err);
        res.status(500).json({
            message: "Server error occurred during registration",
        });
    }
});

app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res
                .status(400)
                .json({ message: "Please provide email and password" });
        }

        const trimmedEmail = email.trim().toLowerCase();

        const [users] = await db.query("SELECT * FROM users WHERE email = ?", [
            trimmedEmail,
        ]);
        if (users.length === 0) {
            return res
                .status(401)
                .json({ message: "Invalid email or password" });
        }

        const user = users[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res
                .status(401)
                .json({ message: "Invalid email or password" });
        }

        const token = jwt.sign(
            {
                id: user.UserID,
                name: user.name,
                role: user.role,
                email: user.email,
            },
            JWT_SECRET,
            { expiresIn: "7d" },
        );

        const isProduction =
            process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

        res.cookie("token", token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.json({
            message: "Login successful",
            user: {
                id: user.UserID,
                name: user.name,
                role: user.role,
                email: user.email,
            },
        });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ message: "Server error occurred during login" });
    }
});

app.get("/api/me", verifyToken, async (req, res) => {
    try {
        const [users] = await db.query(
            "SELECT UserID as id, name, email, role FROM users WHERE UserID = ?",
            [req.user.id],
        );

        if (users.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ user: users[0] });
    } catch (err) {
        console.error("Me Error:", err);
        res.status(500).json({ message: "Error fetching user data" });
    }
});

app.post("/api/logout", (req, res) => {
    const isProduction =
        process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
    res.clearCookie("token", {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
    });
    res.json({ message: "Logout successful" });
});

app.get("/api/admin/overview", verifyToken, requireAdmin, async (req, res) => {
    try {
        const [employees] = await db.query(`
            SELECT 
                u.UserID as id,
                u.name,
                u.email,
                u.role,
                COUNT(t.TaskID) as total,
                COALESCE(SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END), 0) as done,
                COALESCE(SUM(CASE WHEN t.status != 'done' THEN 1 ELSE 0 END), 0) as pending
            FROM users u
            LEFT JOIN tasks t ON u.UserID = t.UserID
            WHERE u.role != 'admin'
            GROUP BY u.UserID, u.name, u.email, u.role
            ORDER BY u.name ASC
        `);

        const [tasks] = await db.query(`
            SELECT 
                t.TaskID as id,
                t.title,
                t.description,
                t.status,
                t.created_at,
                t.UserID as userId,
                u.name as userName,
                u.email as userEmail
            FROM tasks t
            JOIN users u ON t.UserID = u.UserID
            ORDER BY t.created_at DESC
        `);

        res.json({ employees, tasks });
    } catch (err) {
        console.error("Admin Overview Error:", err);
        res.status(500).json({ message: "Error fetching admin overview" });
    }
});

app.post("/api/admin/tasks", verifyToken, requireAdmin, async (req, res) => {
    try {
        const { title, description, assignedTo, userId } = req.body;
        const targetUserId = assignedTo || userId;

        if (!title || !title.trim() || !targetUserId) {
            return res.status(400).json({
                message: "Please provide a task title and select an employee",
            });
        }

        const [empCheck] = await db.query(
            "SELECT UserID FROM users WHERE UserID = ?",
            [targetUserId],
        );
        if (empCheck.length === 0) {
            return res
                .status(404)
                .json({ message: "Selected employee does not exist" });
        }

        const taskId = crypto.randomUUID();
        await db.query(
            "INSERT INTO tasks (TaskID, UserID, title, description, status) VALUES (?, ?, ?, ?, 'pending')",
            [
                taskId,
                targetUserId,
                title.trim(),
                description ? description.trim() : "",
            ],
        );

        res.status(201).json({
            message: "Task assigned successfully",
            taskId,
        });
    } catch (err) {
        console.error("Admin Create Task Error:", err);
        res.status(500).json({ message: "Error assigning task" });
    }
});

app.delete(
    "/api/admin/tasks/:id",
    verifyToken,
    requireAdmin,
    async (req, res) => {
        try {
            const taskId = req.params.id;
            const [result] = await db.query(
                "DELETE FROM tasks WHERE TaskID = ?",
                [taskId],
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Task not found" });
            }

            res.json({ message: "Task deleted successfully" });
        } catch (err) {
            console.error("Admin Delete Task Error:", err);
            res.status(500).json({ message: "Error deleting task" });
        }
    },
);

app.get("/api/dashboard", verifyToken, async (req, res) => {
    try {
        const [tasks] = await db.query(
            `SELECT 
                TaskID as id, 
                title, 
                description, 
                status, 
                created_at 
            FROM tasks 
            WHERE UserID = ? 
            ORDER BY created_at DESC`,
            [req.user.id],
        );

        res.json({
            user: req.user,
            tasks,
        });
    } catch (err) {
        console.error("User Dashboard Error:", err);
        res.status(500).json({ message: "Error fetching dashboard tasks" });
    }
});

app.put("/api/tasks/:id/done", verifyToken, async (req, res) => {
    try {
        const taskId = req.params.id;

        let query = "UPDATE tasks SET status = 'done' WHERE TaskID = ?";
        let params = [taskId];

        if (req.user.role !== "admin") {
            query += " AND UserID = ?";
            params.push(req.user.id);
        }

        const [result] = await db.query(query, params);

        if (result.affectedRows === 0) {
            return res
                .status(404)
                .json({ message: "Task not found or unauthorized" });
        }

        res.json({ message: "Task marked as completed successfully" });
    } catch (err) {
        console.error("Update Task Done Error:", err);
        res.status(500).json({ message: "Error updating task status" });
    }
});

app.put("/api/tasks/:id/status", verifyToken, async (req, res) => {
    try {
        const taskId = req.params.id;
        const { status } = req.body;

        if (!status || !["pending", "done"].includes(status)) {
            return res.status(400).json({ message: "Invalid task status" });
        }

        let query = "UPDATE tasks SET status = ? WHERE TaskID = ?";
        let params = [status, taskId];

        if (req.user.role !== "admin") {
            query += " AND UserID = ?";
            params.push(req.user.id);
        }

        const [result] = await db.query(query, params);

        if (result.affectedRows === 0) {
            return res
                .status(404)
                .json({ message: "Task not found or unauthorized" });
        }

        res.json({ message: "Task status updated successfully" });
    } catch (err) {
        console.error("Update Task Status Error:", err);
        res.status(500).json({ message: "Error updating task status" });
    }
});

if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(
            `🚀 TeamPulse Backend Server is running on http://localhost:${PORT}`,
        );
    });
}

module.exports = app;
