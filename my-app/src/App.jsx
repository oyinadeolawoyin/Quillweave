// src/App.jsx
//
// The root "/" route now immediately sends logged-in users to their own
// profile page. ProfilePage already handles loading, so no extra state
// is needed here.

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./components/auth/authContext";

export default function App() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const id = user?.id ?? user?._id;
    if (id) {
      navigate(`/profile/${id}`, { replace: true });
    } else {
      // Not logged in — send to login
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  // Render nothing while redirect happens
  return null;
}