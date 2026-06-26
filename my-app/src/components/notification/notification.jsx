import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Loader2, Inbox, Check } from "lucide-react";
import { useAuth } from "../auth/authContext";
import API_URL from "@/config/api";

function Notification() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    async function fetchNotifications() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${API_URL}/notifications`, {
          method: "GET",
          credentials: "include",
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.message || "Something went wrong. Try again!");
          return;
        }
        const formatted = data.notifications.map((n) => ({
          ...n,
          isUnread: n.read === false || n.read === null,
        }));
        setNotifications(formatted);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchNotifications();
  }, []);

  async function handleMarkAllAsRead() {
    try {
      const response = await fetch(`${API_URL}/notifications/${user.id}/read`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to mark all as read");
      }
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isUnread: false, read: true }))
      );
    } catch (err) {
      console.error(err);
    }
  }

  const unreadCount = notifications.filter((n) => n.isUnread).length;
  const unreadExists = unreadCount > 0;

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-3xl mx-auto">
      {/* Page Title */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-ink-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-ink-primary" />
            </div>
            <h1 className="text-3xl font-serif text-ink-primary">Notifications</h1>
          </div>

          {unreadExists && (
            <span className="bg-ink-gold/20 text-ink-primary text-sm font-medium px-3 py-1 rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>

        {unreadExists && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-ink-primary text-sm hover:text-ink-gold transition-colors duration-200 flex items-center gap-1.5 font-medium"
          >
            <Check className="w-4 h-4" />
            Mark all as read
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-ink-primary animate-spin mb-3" />
          <p className="text-ink-gray text-sm">Loading notifications...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-white rounded-xl shadow-soft p-4 border-l-4 border-red-400">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Notifications List */}
      {!loading && !error && notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Link
              key={notification.id}
              to={notification.link}
              className={`block bg-white rounded-xl shadow-soft p-5 transition-all duration-200 hover:shadow-soft-lg group ${
                notification.isUnread
                  ? "border-l-4 border-ink-gold"
                  : "border-l-4 border-transparent"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                    notification.isUnread ? "bg-ink-gold/20" : "bg-ink-lightgray/30"
                  }`}
                >
                  <Bell
                    className={`w-4 h-4 ${
                      notification.isUnread ? "text-ink-gold" : "text-ink-gray"
                    }`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm leading-relaxed ${
                      notification.isUnread
                        ? "text-ink-primary font-medium"
                        : "text-ink-gray"
                    }`}
                  >
                    {notification.message}
                  </p>
                  {notification.createdAt && (
                    <p className="text-xs text-ink-lightgray mt-2">
                      {new Date(notification.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </p>
                  )}
                </div>

                {!notification.isUnread && (
                  <div className="flex-shrink-0">
                    <Check className="w-4 h-4 text-ink-lightgray" />
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        !loading &&
        !error && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-ink-lightgray/20 flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8 text-ink-lightgray" />
            </div>
            <h2 className="text-xl font-serif text-ink-primary mb-2">
              No notifications yet
            </h2>
            <p className="text-sm text-ink-gray max-w-sm">
              When you receive notifications, they'll appear here.
            </p>
          </div>
        )
      )}
    </div>
  );
}

export default Notification;