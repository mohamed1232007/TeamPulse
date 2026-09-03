import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { HashLoader } from "react-spinners";
import api from "../api";
import "./Userdashboard.css";

export default function UserDashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        async function loadDashboard() {
            const minDelay = new Promise((resolve) => setTimeout(resolve, 750));
            try {
                const [res] = await Promise.all([
                    api.get("/dashboard", { signal: controller.signal }),
                    minDelay,
                ]);
                if (!isMounted) return;

                setUser(res.data.user);
                setTasks(res.data.tasks || []);
            } catch (err) {
                if (err.name === "CanceledError" || err.code === "ERR_CANCELED")
                    return;
                console.error("Error fetching dashboard:", err);
                if (err.response?.status === 401) {
                    localStorage.removeItem("user");
                    navigate("/login", { replace: true });
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        loadDashboard();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [navigate]);

    const handleToggleStatus = async (taskId, currentStatus) => {
        const newStatus = currentStatus === "done" ? "pending" : "done";
        setUpdatingId(taskId);

        const previousTasks = [...tasks];
        setTasks((prevTasks) =>
            prevTasks.map((t) =>
                t.id === taskId ? { ...t, status: newStatus } : t,
            ),
        );

        try {
            await api.put(`/tasks/${taskId}/status`, { status: newStatus });
        } catch (err) {
            console.error("Error updating task status:", err);
            setTasks(previousTasks);
            alert("Failed to update task status. Please try again.");
        } finally {
            setUpdatingId(null);
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

    const doneCount = tasks.filter((t) => t.status === "done").length;
    const pendingCount = tasks.length - doneCount;

    const filteredTasks = tasks.filter((task) => {
        if (filter === "done") return task.status === "done";
        if (filter === "pending") return task.status !== "done";
        return true;
    });

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
                            Loading your dashboard...
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-page-container">
            <div className="dash-page">
                <div className="dash-header">
                    <div className="dash-title">
                        <h1>Employee Dashboard</h1>
                        <p>{user ? `Welcome back, ${user.name}` : ""}</p>
                    </div>
                    <button className="dash-logout" onClick={handleLogout}>
                        Logout
                    </button>
                </div>

                <div className="dash-stats">
                    <div className="stat-card accent">
                        <div className="stat-value">{tasks.length}</div>
                        <div className="stat-label">Total Assigned Tasks</div>
                    </div>
                    <div className="stat-card">
                        <div
                            className="stat-value"
                            style={{ color: "#34d399" }}
                        >
                            {doneCount}
                        </div>
                        <div className="stat-label">Completed Tasks</div>
                    </div>
                    <div className="stat-card">
                        <div
                            className="stat-value"
                            style={{ color: "#f59e0b" }}
                        >
                            {pendingCount}
                        </div>
                        <div className="stat-label">Pending Tasks</div>
                    </div>
                </div>

                <div className="dash-panel">
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "12px",
                            marginBottom: "1.5rem",
                            borderBottom: "1px solid #1e293b",
                            paddingBottom: "0.75rem",
                        }}
                    >
                        <h3 style={{ margin: 0, border: "none", padding: 0 }}>
                            My Task List
                        </h3>

                        <div className="filter-buttons">
                            <button
                                className={`filter-btn ${filter === "all" ? "active" : ""}`}
                                onClick={() => setFilter("all")}
                            >
                                All ({tasks.length})
                            </button>
                            <button
                                className={`filter-btn ${filter === "pending" ? "active" : ""}`}
                                onClick={() => setFilter("pending")}
                            >
                                Pending ({pendingCount})
                            </button>
                            <button
                                className={`filter-btn ${filter === "done" ? "active" : ""}`}
                                onClick={() => setFilter("done")}
                            >
                                Completed ({doneCount})
                            </button>
                        </div>
                    </div>

                    {filteredTasks.length === 0 ? (
                        <div className="empty-state">
                            {tasks.length === 0
                                ? "🎉 You don't have any tasks assigned yet!"
                                : "No tasks matching this filter."}
                        </div>
                    ) : (
                        <div className="task-list">
                            {filteredTasks.map((task) => (
                                <div
                                    key={task.id}
                                    className={`task-item ${task.status === "done" ? "done" : ""}`}
                                >
                                    <div className="task-info">
                                        <h4>{task.title}</h4>
                                        {task.description && (
                                            <p>{task.description}</p>
                                        )}
                                        <div
                                            style={{
                                                fontSize: "0.8rem",
                                                color: "#64748b",
                                                marginTop: "0.4rem",
                                            }}
                                        >
                                            Assigned:{" "}
                                            {task.created_at
                                                ? new Date(
                                                      task.created_at,
                                                  ).toLocaleDateString()
                                                : "-"}
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "10px",
                                        }}
                                    >
                                        {task.status === "done" ? (
                                            <span className="badge-done">
                                                Done ✓
                                            </span>
                                        ) : (
                                            <span className="badge-pending">
                                                Pending
                                            </span>
                                        )}

                                        <button
                                            className={`task-action-btn ${
                                                task.status === "done"
                                                    ? "btn-undo"
                                                    : "btn-done"
                                            }`}
                                            disabled={updatingId === task.id}
                                            onClick={() =>
                                                handleToggleStatus(
                                                    task.id,
                                                    task.status,
                                                )
                                            }
                                        >
                                            {updatingId === task.id ? (
                                                <span className="btn-spinner"></span>
                                            ) : task.status === "done" ? (
                                                "↺ Undo"
                                            ) : (
                                                "✓ Mark as Done"
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
