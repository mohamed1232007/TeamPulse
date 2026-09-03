import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import "./Register.css";

export default function Register() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccessMsg("");

        if (!name.trim() || !email.trim() || !password) {
            setError("Please fill in all required fields.");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);

        try {
            const res = await api.post("/register", {
                name: name.trim(),
                email: email.trim(),
                password,
            });

            setSuccessMsg(
                res.data?.message ||
                    "Account created successfully! Redirecting to login...",
            );

            localStorage.removeItem("user");

            setTimeout(() => {
                navigate("/login", { replace: true });
            }, 1200);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Failed to create account. Please try again.",
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-page">
            <div className="register-card">
                <h2 className="register-title">Create Account</h2>
                <p className="register-subtitle">
                    Join TeamPulse to manage your team & tasks
                </p>

                <form onSubmit={handleSubmit} className="register-form">
                    <div className="register-input-group">
                        <label htmlFor="reg-name">Full Name</label>
                        <input
                            type="text"
                            id="reg-name"
                            required
                            placeholder="e.g. Mohamed Ali"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <div className="register-input-group">
                        <label htmlFor="reg-email">Email Address</label>
                        <input
                            type="email"
                            id="reg-email"
                            required
                            placeholder="e.g. user@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <div className="register-input-group">
                        <label htmlFor="reg-password">Password </label>
                        <input
                            type="password"
                            id="reg-password"
                            required
                            minLength={6}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    {error && <div className="register-error">{error}</div>}
                    {successMsg && (
                        <div className="register-success">{successMsg}</div>
                    )}

                    <button
                        type="submit"
                        className="register-btn"
                        disabled={loading}
                    >
                        {loading ? "Creating account..." : "Sign Up"}
                    </button>
                </form>

                <p className="register-footer">
                    Already have an account? <Link to="/login">Login</Link>
                </p>
            </div>
        </div>
    );
}
