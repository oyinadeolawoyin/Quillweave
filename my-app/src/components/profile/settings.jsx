import { useState } from "react";
import { useAuth } from "../auth/authContext";
import Header from "./header";
import API_URL from "@/config/api";

export default function Settings() {
  const { user, updateUserContext } = useAuth();

  // ─── Discord linking state ────────────────────────────────────
  const [discordId, setDiscordId] = useState("");
  const [discordLoading, setDiscordLoading] = useState(false);
  const [discordError, setDiscordError] = useState("");
  const [discordSuccess, setDiscordSuccess] = useState("");

  // ─── Password change state ────────────────────────────────────
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // ─── Email (recovery) state ───────────────────────────────────
  const [email, setEmail] = useState(user?.email || "");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");

  const isDiscordLinked = !!user?.discordId;
  const isDiscordOnly = isDiscordLinked && !user?.password; // auto-created via bot, no password yet
  const hasEmail = !!user?.email;

  // ─── Discord link handler ─────────────────────────────────────
  async function handleLinkDiscord(e) {
    e.preventDefault();
    setDiscordError("");
    setDiscordSuccess("");

    if (!discordId.trim()) return setDiscordError("Please enter your Discord ID.");
    if (!/^\d{17,20}$/.test(discordId.trim())) {
      return setDiscordError(
        "That doesn't look like a valid Discord ID — it should be 17–20 digits. Use /myid in our Discord server to get yours."
      );
    }

    setDiscordLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/discord/link`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ discordId: discordId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) return setDiscordError(data.message || "Failed to link Discord account.");
      if (updateUserContext) updateUserContext(data.user);
      setDiscordSuccess("Discord account linked! You can now start and join sprints from Discord 🌱");
      setDiscordId("");
    } catch {
      setDiscordError("Something went wrong. Please try again.");
    } finally {
      setDiscordLoading(false);
    }
  }

  // ─── Discord unlink handler ───────────────────────────────────
  async function handleUnlinkDiscord() {
    setDiscordError("");
    setDiscordSuccess("");
    setDiscordLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/discord/unlink`, {
        method: "PATCH",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) return setDiscordError(data.message || "Failed to unlink Discord account.");
      if (updateUserContext) updateUserContext(data.user);
      setDiscordSuccess("Discord account unlinked.");
    } catch {
      setDiscordError("Something went wrong. Please try again.");
    } finally {
      setDiscordLoading(false);
    }
  }

  // ─── Password change handler ──────────────────────────────────
  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (passwords.newPassword !== passwords.confirmPassword) {
      return setPasswordError("New passwords don't match.");
    }
    if (passwords.newPassword.length < 8) {
      return setPasswordError("New password must be at least 8 characters.");
    }
    // If user already has a password, require current password
    if (!isDiscordOnly && !passwords.currentPassword) {
      return setPasswordError("Please enter your current password.");
    }

    setPasswordLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/changePassword`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: passwords.currentPassword || null,
          newPassword: passwords.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) return setPasswordError(data.message || "Failed to change password.");
      if (updateUserContext) updateUserContext(data.user);
      setPasswordSuccess(
        isDiscordOnly
          ? "Password set! You can now log in with your Discord ID and this password."
          : "Password updated successfully."
      );
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch {
      setPasswordError("Something went wrong. Please try again.");
    } finally {
      setPasswordLoading(false);
    }
  }

  // ─── Email save handler ───────────────────────────────────────
  async function handleSaveEmail(e) {
    e.preventDefault();
    setEmailError("");
    setEmailSuccess("");

    const trimmed = email.trim();
    if (!trimmed) return setEmailError("Please enter an email address.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return setEmailError("Please enter a valid email address.");
    }

    setEmailLoading(true);
    try {
      const res = await fetch(`${API_URL}/user/updateUser`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) return setEmailError(data.message || "Failed to save email.");
      if (updateUserContext) updateUserContext(data.user);
      setEmailSuccess("Email saved! You can now use it to reset your password if needed.");
    } catch {
      setEmailError("Something went wrong. Please try again.");
    } finally {
      setEmailLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-cream">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-serif text-ink-primary mb-2">Settings</h1>
          <p className="text-ink-gray text-sm">Manage your account connections and security</p>
        </div>

        {/* ─── Discord section ──────────────────────────────────── */}
        <section className="bg-white rounded-2xl shadow-soft p-6 sm:p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#5865F2] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-serif text-ink-primary">Discord</h2>
              <p className="text-sm text-ink-gray mt-0.5">
                Link your Discord account to start and join sprints directly from our server
              </p>
            </div>
          </div>

          {isDiscordLinked ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <svg className="w-5 h-5 text-green-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-green-800">Discord account linked</p>
                  <p className="text-xs text-green-600 mt-0.5 font-mono">{user.discordId}</p>
                </div>
              </div>

              {discordError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-sm text-red-800">{discordError}</p>
                </div>
              )}
              {discordSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <p className="text-sm text-green-800">{discordSuccess}</p>
                </div>
              )}

              <button
                onClick={handleUnlinkDiscord}
                disabled={discordLoading}
                className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {discordLoading ? "Unlinking..." : "Unlink Discord"}
              </button>
            </div>
          ) : (
            <form onSubmit={handleLinkDiscord} className="space-y-4">
              <div className="bg-[#f7f4ee] rounded-xl px-4 py-3 space-y-1">
                <p className="text-xs font-medium text-ink-primary">How to get your Discord ID:</p>
                <ol className="text-xs text-ink-gray space-y-1 list-decimal list-inside">
                  <li>Open our Discord server</li>
                  <li>Type <code className="bg-white px-1 py-0.5 rounded text-[#5865F2] font-mono">/myid</code> and press Enter</li>
                  <li>The bot will DM you your Discord ID privately</li>
                  <li>Paste it below and click Link</li>
                </ol>
              </div>

              <div>
                <label htmlFor="discordId" className="block text-sm font-medium text-ink-primary mb-2">
                  Your Discord ID
                </label>
                <input
                  id="discordId"
                  type="text"
                  value={discordId}
                  onChange={(e) => { setDiscordId(e.target.value); setDiscordError(""); setDiscordSuccess(""); }}
                  placeholder="e.g. 123456789012345678"
                  className="w-full px-4 py-3 rounded-lg border border-ink-lightgray font-mono text-sm focus:ring-2 focus:ring-ink-gold focus:border-ink-gold transition-all text-ink-gray"
                  disabled={discordLoading}
                />
              </div>

              {discordError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-sm text-red-800">{discordError}</p>
                </div>
              )}
              {discordSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <p className="text-sm text-green-800">{discordSuccess}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={discordLoading}
                className="w-full py-3 px-6 bg-[#5865F2] text-white text-sm font-medium rounded-xl hover:opacity-90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {discordLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Linking...
                  </span>
                ) : "Link Discord Account"}
              </button>
            </form>
          )}
        </section>

        {/* ─── Recovery Email section (Discord-only users) ──────── */}
        {isDiscordOnly && (
          <section className="bg-white rounded-2xl shadow-soft p-6 sm:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-serif text-ink-primary">Recovery Email</h2>
                <p className="text-sm text-ink-gray mt-0.5">
                  Add an email so you can reset your password if you ever get locked out
                </p>
              </div>
            </div>

            {/* Info banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
              <p className="text-xs text-amber-800">
                <strong>Optional but recommended.</strong> Your account was created via Discord so you can log in
                with your Discord ID and password. Adding an email lets you recover access if you forget your password.
              </p>
            </div>

            <form onSubmit={handleSaveEmail} className="space-y-4">
              <div>
                <label htmlFor="recoveryEmail" className="block text-sm font-medium text-ink-primary mb-2">
                  Email Address
                </label>
                <input
                  id="recoveryEmail"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(""); setEmailSuccess(""); }}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-lg border border-ink-lightgray text-sm focus:ring-2 focus:ring-ink-gold focus:border-ink-gold transition-all text-ink-gray"
                  disabled={emailLoading}
                />
              </div>

              {emailError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-sm text-red-800">{emailError}</p>
                </div>
              )}
              {emailSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <p className="text-sm text-green-800">{emailSuccess}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={emailLoading}
                className="w-full py-3 px-6 bg-amber-500 text-white text-sm font-medium rounded-xl hover:opacity-90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {emailLoading ? "Saving..." : hasEmail ? "Update Email" : "Save Email"}
              </button>
            </form>
          </section>
        )}

        {/* ─── Password section ─────────────────────────────────── */}
        {/* Show for ALL users — Discord-only users can set a first password */}
        <section className="bg-white rounded-2xl shadow-soft p-6 sm:p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#2d3748] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-serif text-ink-primary">Password</h2>
              <p className="text-sm text-ink-gray mt-0.5">
                {isDiscordOnly
                  ? "Set a password so you can log in with your Discord ID + password"
                  : "Update your account password"}
              </p>
            </div>
          </div>

          {/* Info banner for Discord-only users */}
          {isDiscordOnly && (
            <div className="bg-[#f0f0ff] border border-[#c7c9f9] rounded-xl px-4 py-3 mb-4">
              <p className="text-xs text-[#3b3f9e]">
                <strong>How login works for you:</strong> You joined via Discord, so you can log in using your
                Discord ID as your username and the password you set here. No email needed.
              </p>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Only show current password field if user already has a password */}
            {!isDiscordOnly && (
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-ink-primary mb-2">
                  Current Password
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-ink-lightgray focus:ring-2 focus:ring-ink-gold focus:border-ink-gold transition-all text-ink-gray"
                  disabled={passwordLoading}
                />
              </div>
            )}

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-ink-primary mb-2">
                {isDiscordOnly ? "Password" : "New Password"}
              </label>
              <input
                id="newPassword"
                type="password"
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-ink-lightgray focus:ring-2 focus:ring-ink-gold focus:border-ink-gold transition-all text-ink-gray"
                disabled={passwordLoading}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink-primary mb-2">
                {isDiscordOnly ? "Confirm Password" : "Confirm New Password"}
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-ink-lightgray focus:ring-2 focus:ring-ink-gold focus:border-ink-gold transition-all text-ink-gray"
                disabled={passwordLoading}
              />
            </div>

            {passwordError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-sm text-red-800">{passwordError}</p>
              </div>
            )}
            {passwordSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <p className="text-sm text-green-800">{passwordSuccess}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full py-3 px-6 bg-ink-primary text-white text-sm font-medium rounded-xl hover:opacity-90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {passwordLoading
                ? "Saving..."
                : isDiscordOnly
                ? "Set Password"
                : "Update Password"}
            </button>
          </form>
        </section>

      </main>
    </div>
  );
}