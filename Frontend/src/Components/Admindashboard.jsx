import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { HashLoader } from "react-spinners";
import api from "../api";
import "./Admindashboard.css";

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [updatingTaskId, setUpdatingTaskId] = useState(null);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [assignedTo, setAssignedTo] = useState("");
    const [feedbackMsg, setFeedbackMsg] = useState({ type: "", text: "" });

    const reloadAdminData = useCallback(async () => {
        try {
            const overviewRes = await api.get("/admin/overview");
            setEmployees(overviewRes.data.employees || []);
            setTasks(overviewRes.data.tasks || []);
        } catch (err) {
            console.error("Error refreshing admin data:", err);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        async function loadInitialData() {
            const minDelay = new Promise((resolve) => setTimeout(resolve, 750));
            try {
                const [meRes] = await Promise.all([
                    api.get("/me", { signal: controller.signal }),
                    minDelay,
                ]);
                if (!isMounted) return;

                if (meRes.data.user?.role !== "admin") {
                    navigate("/dashboard", { replace: true });
                    return;
                }
                setCurrentUser(meRes.data.user);

                const overviewRes = await api.get("/admin/overview", {
                    signal: controller.signal,
                });
                if (!isMounted) return;

                setEmployees(overviewRes.data.employees || []);
                setTasks(overviewRes.data.tasks || []);
            } catch (err) {
                if (err.name === "CanceledError" || err.code === "ERR_CANCELED")
                    return;
                console.error("Error fetching admin data:", err);
                if (
                    err.response?.status === 401 ||
                    err.response?.status === 403
                ) {
                    localStorage.removeItem("user");
                    navigate("/login", { replace: true });
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        loadInitialData();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [navigate]);

    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!title.trim() || !assignedTo) {
            setFeedbackMsg({
                type: "error",
                text: "Please provide a task title and select an employee.",
            });
            return;
        }

        setSubmitting(true);
        setFeedbackMsg({ type: "", text: "" });

        try {
            const res = await api.post("/admin/tasks", {
                title: title.trim(),
                description: description.trim(),
                assignedTo,
            });

            setFeedbackMsg({
                type: "success",
                text: res.data.message || "Task assigned successfully!",
            });

            setTitle("");
            setDescription("");
            setAssignedTo("");

            await reloadAdminData();
        } catch (err) {
            console.error("Error creating task:", err);
            setFeedbackMsg({
                type: "error",
                text:
                    err.response?.data?.message ||
                    "Failed to create task. Please try again.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm("Are you sure you want to delete this task?"))
            return;

        setDeletingId(taskId);
        try {
            await api.delete(`/admin/tasks/${taskId}`);
            setTasks((prev) => prev.filter((t) => t.id !== taskId));

            await reloadAdminData();
        } catch (err) {
            console.error("Error deleting task:", err);
            alert(err.response?.data?.message || "Failed to delete task.");
        } finally {
            setDeletingId(null);
        }
    };

    const handleToggleTaskStatus = async (taskId, currentStatus) => {
        const newStatus = currentStatus === "done" ? "pending" : "done";
        setUpdatingTaskId(taskId);
        try {
            await api.put(`/tasks/${taskId}/status`, { status: newStatus });
            setTasks((prev) =>
                prev.map((t) =>
                    t.id === taskId ? { ...t, status: newStatus } : t,
                ),
            );

            await reloadAdminData();
        } catch (err) {
            console.error("Error updating status:", err);
            alert("Failed to update task status.");
        } finally {
            setUpdatingTaskId(null);
        }
    };

    const handleLogout = async () => {
        try {
            await api.post("/logout");
        } catch (err) {
            console.error("Logout error:", err);
        } finally {
            localStorage.removeItem("user");
            navigate("/login", { replace: true });
        }
    };

    if (loading) {
        return (
            <div className="dashboard-page-container">
                <div className="dash-page">
                    <div className="dashboard-loader-container">
                        <HashLoader
                            color="#6366f1"
                            size={55}
                            speedMultiplier={1.1}
                        />
                        <div className="loader-text">
                            Loading Admin Dashboard...
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "done").length;
    const pendingTasks = totalTasks - completedTasks;

    return (
        <div className="dashboard-page-container">
            <div className="dash-page">
                <div className="dash-header">
                    <div className="dash-title">
                        <h1>Admin Dashboard</h1>
                        <p>
                            {currentUser
                                ? `Welcome back, ${currentUser.name} (Admin)`
                                : ""}
                        </p>
                    </div>
                    <button className="dash-logout" onClick={handleLogout}>
                        Logout
                    </button>
                </div>

                <div className="dash-stats">
                    <div className="stat-card">
                        <div className="stat-value">{employees.length}</div>
                        <div className="stat-label">Total Employees</div>
                    </div>
                    <div className="stat-card accent">
                        <div className="stat-value">{totalTasks}</div>
                        <div className="stat-label">Total Tasks</div>
                    </div>
                    <div className="stat-card">
                        <div
                            className="stat-value"
                            style={{ color: "#34d399" }}
                        >
                            {completedTasks}
                        </div>
                        <div className="stat-label">Completed Tasks</div>
                    </div>
                    <div className="stat-card">
                        <div
                            className="stat-value"
                            style={{ color: "#f59e0b" }}
                        >
                            {pendingTasks}
                        </div>
                        <div className="stat-label">Pending Tasks</div>
                    </div>
                </div>

                <div className="dash-panel">
                    <h3>Assign New Task</h3>

                    {feedbackMsg.text && (
                        <div className={`feedback-alert ${feedbackMsg.type}`}>
                            {feedbackMsg.text}
                        </div>
                    )}

                    <form onSubmit={handleCreateTask} className="task-form">
                        <div className="form-group">
                            <label htmlFor="task-title">Task Title *</label>
                            <input
                                id="task-title"
                                type="text"
                                placeholder="e.g. Implement Responsive Navbar"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                disabled={submitting}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="task-desc">Description</label>
                            <textarea
                                id="task-desc"
                                placeholder="Enter detailed requirements or notes..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                disabled={submitting}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="assign-employee">
                                Assign To Employee *
                            </label>
                            <select
                                id="assign-employee"
                                value={assignedTo}
                                onChange={(e) => setAssignedTo(e.target.value)}
                                disabled={submitting}
                                required
                            >
                                <option value="">-- Select Employee --</option>
                                {employees.map((emp) => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.name} ({emp.email})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="submit"
                            className="btn-submit"
                            disabled={submitting || employees.length === 0}
                        >
                            {submitting ? "Assigning Task..." : "Assign Task"}
                        </button>
                    </form>
                </div>

                <div className="dash-panel">
                    <h3>Employees Overview</h3>
                    {employees.length === 0 ? (
                        <div className="empty-state">
                            No registered employees found.
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="custom-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Total Tasks</th>
                                        <th>Completed</th>
                                        <th>Pending</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.map((emp) => (
                                        <tr key={emp.id}>
                                            <td style={{ fontWeight: 600 }}>
                                                {emp.name}
                                            </td>
                                            <td>{emp.email}</td>
                                            <td>{emp.total}</td>
                                            <td style={{ color: "#34d399" }}>
                                                {emp.done}
                                            </td>
                                            <td style={{ color: "#f59e0b" }}>
                                                {emp.pending}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="dash-panel">
                    <h3>All Assigned Tasks</h3>
                    {tasks.length === 0 ? (
                        <div className="empty-state">No tasks created yet.</div>
                    ) : (
                        <div className="table-container">
                            <table className="custom-table">
                                <thead>
                                    <tr>
                                        <th>Task Title</th>
                                        <th>Description</th>
                                        <th>Assigned To</th>
                                        <th>Status</th>
                                        <th>Created Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tasks.map((task) => (
                                        <tr key={task.id}>
                                            <td style={{ fontWeight: 600 }}>
                                                {task.title}
                                            </td>
                                            <td
                                                style={{
                                                    color: "#94a3b8",
                                                    maxWidth: "250px",
                                                }}
                                            >
                                                {task.description || "-"}
                                            </td>
                                            <td>
                                                <div>{task.userName}</div>
                                                <div
                                                    style={{
                                                        fontSize: "0.8rem",
                                                        color: "#64748b",
                                                    }}
                                                >
                                                    {task.userEmail}
                                                </div>
                                            </td>
                                            <td>
                                                {task.status === "done" ? (
                                                    <span className="badge-done">
                                                        Completed ✓
                                                    </span>
                                                ) : (
                                                    <span className="badge-pending">
                                                        Pending ⏳
                                                    </span>
                                                )}
                                            </td>
                                            <td
                                                style={{
                                                    fontSize: "0.85rem",
                                                    color: "#94a3b8",
                                                }}
                                            >
                                                {task.created_at
                                                    ? new Date(
                                                          task.created_at,
                                                      ).toLocaleDateString()
                                                    : "-"}
                                            </td>
                                            <td>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        gap: "8px",
                                                    }}
                                                >
                                                    <button
                                                        className="action-btn toggle-btn"
                                                        disabled={
                                                            updatingTaskId ===
                                                            task.id
                                                        }
                                                        onClick={() =>
                                                            handleToggleTaskStatus(
                                                                task.id,
                                                                task.status,
                                                            )
                                                        }
                                                        title="Toggle Status"
                                                    >
                                                        {updatingTaskId ===
                                                        task.id ? (
                                                            <span className="btn-spinner"></span>
                                                        ) : task.status ===
                                                          "done" ? (
                                                            "↺ Undo"
                                                        ) : (
                                                            "✓ Complete"
                                                        )}
                                                    </button>
                                                    <button
                                                        className="action-btn delete-btn"
                                                        disabled={
                                                            deletingId ===
                                                            task.id
                                                        }
                                                        onClick={() =>
                                                            handleDeleteTask(
                                                                task.id,
                                                            )
                                                        }
                                                        title="Delete Task"
                                                    >
                                                        {deletingId === task.id
                                                            ? "..."
                                                            : "Delete"}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
