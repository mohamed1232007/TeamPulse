import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";
import Home from "./Components/Home";
import Login from "./Components/Login";
import Register from "./Components/Register";
import AdminDashboard from "./Components/Admindashboard";
import UserDashboard from "./Components/Userdashboard";
import "./App.css";

const getStoredUser = () => {
    try {
        const userStr = localStorage.getItem("user");
        return userStr ? JSON.parse(userStr) : null;
    } catch {
        return null;
    }
};

function ProtectedRoute({ children }) {
    const user = getStoredUser();
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    return children;
}

function AdminRoute({ children }) {
    const user = getStoredUser();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (user.role !== "admin") {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}

function App() {
    return (
        <Router>
            
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                <Route
                    path="/admin"
                    element={
                        <AdminRoute>
                            <AdminDashboard />
                        </AdminRoute>
                    }
                />

                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <UserDashboard />
                        </ProtectedRoute>
                    }
                />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
