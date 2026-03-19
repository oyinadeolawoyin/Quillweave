import { createContext, useEffect, useState, useContext } from "react";
import API_URL from "../../config/api";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });
  
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          method: "GET",
          credentials: "include",
        });

        if (res.status === 401) {
          setUser(null);
          localStorage.removeItem("user");
        } else if (res.ok) {
          const data = await res.json();
          // getMe returns the user object directly (not wrapped in { user })
          const freshUser = data.user ?? data;
          setUser(freshUser);
        } else {
          setUser(null);
          localStorage.removeItem("user");
        }
      } catch (error) {
        // Network error — keep the cached localStorage user so the app still works offline
        console.error("Auth check failed:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUser();
  }, []);

  const logout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setUser(null);
      localStorage.removeItem("user");
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}