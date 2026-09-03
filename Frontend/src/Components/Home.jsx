import { Link } from "react-router-dom";
import "./Home.css";

export default function Home() {
    const userStr = localStorage.getItem("user");
    let user = null;
    try {
        if (userStr) user = JSON.parse(userStr);
    } catch {
        user = null;
    }

    return (
        <div className="home-page">
            <div className="home-card">
                <h1 className="home-title">TeamPulse</h1>
                

                {user ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <p style={{ color: "#38bdf8", fontWeight: 600, margin: 0 }}>
                            Logged in as: {user.name} ({user.role})
                        </p>
                        <Link
                            to={user.role === "admin" ? "/admin" : "/dashboard"}
                            className="home-btn"
                        >
                            Go to Dashboard →
                        </Link>
                    </div>
                ) : (
                    <div className="home-buttons">
                        <Link to="/login" className="home-btn">
                            Login
                        </Link>
                        <Link to="/register" className="home-btn home-btn-secondary">
                            Register
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
