import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import "./Login.css";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!email.trim() || !password) {
            setError("Please enter your email and password.");
            return;
        }

        setLoading(true);

        try {
            const res = await api.post("/login", {
                email: email.trim(),
                password,
            });

            const { user } = res.data;

            if (user) {
                localStorage.setItem("user", JSON.stringify(user));
            }

            if (user?.role === "admin") {
                navigate("/admin", { replace: true });
            } else {
                navigate("/dashboard", { replace: true });
            }
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Login failed. Please check your credentials.",
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <h2 className="login-title">Welcome Back</h2>
                <p className="login-subtitle">
                    Sign in to your TeamPulse account
                </p>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="login-input-group">
                        <label htmlFor="login-email">Email Address</label>
                        <input
                            type="email"
                            id="login-email"
                            required
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <div className="login-input-group">
                        <label htmlFor="login-password">Password</label>
                        <input
                            type="password"
                            id="login-password"
                            required
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    {error && <div className="login-error">{error}</div>}

                    <button
                        type="submit"
                        className="login-btn"
                        disabled={loading}
                    >
                        {loading ? "Signing in..." : "Login"}
                    </button>
                </form>

                <p className="login-footer">
                    Don't have an account? <Link to="/register">Sign Up</Link>
                </p>
            </div>
        </div>
    );
}
