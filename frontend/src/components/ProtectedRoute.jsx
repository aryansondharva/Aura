import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("userToken");
  const userId = localStorage.getItem("userId");
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (!token || !userId) {
      setLoading(false);
      return;
    }

    const checkVerification = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/user/${userId}`);
        if (response.data && response.data.mobile) {
          setIsVerified(true);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setLoading(false);
      }
    };

    checkVerification();
  }, [token, userId]);

  if (loading) return <div className="home-container dev-page" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner"></div></div>;

  if (!token) return <Navigate to="/signin" replace />;
  if (!isVerified) return <Navigate to="/signin" replace />;

  return children;
};

export default ProtectedRoute;

