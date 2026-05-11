import { useState, useRef } from "react";
import { useAuth } from "../auth/authContext";
import Header from "./header";
import API_URL from "@/config/api";
import NotificationSettings from "./notificationsettings";

export default function Settings() {
  const { user, updateUserContext, logout } = useAuth();

  // ─── Profile state ────────────────────────────────────────────
  const [profileForm, setProfileForm] = useState({
    username:    user?.username    ?? "",
    bio:         user?.bio         ?? "",
    dateOfBirth: user?.dateOfBirth
      ? new Date(user.dateOfBirth).toISOString().split("T")[0]
      : "",
  });
  const [avatarFile, setAvatarFile]         = useState(null);
  const [avatarPreview, setAvatarPreview]   = useState(user?.avatar ?? null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError]     = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const fileInputRef = useRef(null);

  // ─── Discord state ────────────────────────────────────────────
  const [discordError, setDiscordError]     = useState("");
  const [discordSuccess, setDiscordSuccess] = useState("");
  const [discordLoading, setDiscordLoading] = useState(false);

  // ─── Password change state ────────────────────────────────────
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError]     = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // ─── Email (recovery) state ───────────────────────────────────
  const [email, setEmail]               = useState(user?.email ?? "");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError]     = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");

  // ─── Delete account state ─────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError]     = useState("");
  const DELETE_PHRASE = "delete my account";

  const isDiscordLinked = !!user?.discordId;
  const isDiscordOnly   = isDiscordLinked && !user?.password;
  const hasEmail        = !!user?.email;

  const bioCharCount = profileForm.bio.trim().length;

  // ─── Avatar pick ──────────────────────────────────────────────
  function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setProfileError("");
    setProfileSuccess("");
  }

  // ─── Profile save ─────────────────────────────────────────────
  async function handleSaveProfile(e) {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    if (bioCharCount > 400) {
      return setProfileError("Bio must not exceed 400 characters.");
    }

    setProfileLoading(true);
    try {
      const body = new FormData();
      body.append("username",    profileForm.username.trim());
      body.append("bio",         profileForm.bio.trim());
      body.append("dateOfBirth", profileForm.dateOfBirth || "");
      if (avatarFile) body.append("avatar", avatarFile);

      const res = await fetch(`${API_URL}/users/updateUser`, {
        method: "POST",
        credentials: "include",
        body,
      });
      const data = await res.json();
      if (!res.ok) return setProfileError(data.message || "Failed to save profile.");
      if (updateUserContext) updateUserContext(data.user);
      setProfileSuccess("Profile updated successfully.");
      setAvatarFile(null);
    } catch {
      setProfileError("Something went wrong. Please try again.");
    } finally {
      setProfileLoading(false);
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
      const res = await fetch(`${API_URL}/users/updateUser`, {
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

  // ─── Delete account handler ───────────────────────────────────
  async function handleDeleteAccount() {
    setDeleteError("");
    if (deleteConfirmText.toLowerCase() !== DELETE_PHRASE) return;

    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/me`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.message || "Failed to delete account. Please try again.");
        return;
      }
      // Log the user out on the client side
      if (logout) logout();
      // Redirect to home / landing page
      window.location.href = "/";
    } catch {
      setDeleteError("Something went wrong. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-cream">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-serif text-ink-primary mb-2">Settings</h1>
          <p className="text-ink-gray text-sm">Manage your profile and account</p>
        </div>

        {/* ─── Profile section ──────────────────────────────────── */}
        <section className="bg-white rounded-2xl shadow-soft p-6 sm:p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#2d3748] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-serif text-ink-primary">Profile</h2>
              <p className="text-sm text-ink-gray mt-0.5">
                Your public-facing identity on Inkwell
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-5">

            {/* Avatar */}
            <div>
              <label className="block text-sm font-medium text-ink-primary mb-3">
                Profile picture
              </label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#e8e0d0] bg-[#f4f1ec] flex items-center justify-center shrink-0">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-serif text-3xl text-[#b8a898]">
                      {user?.username?.[0]?.toUpperCase() ?? "?"}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl border border-[#e8e0d0] text-sm text-[#6b5c4a] hover:border-[#2d3748] hover:text-[#2d3748] transition-all font-medium"
                  >
                    {avatarPreview ? "Change photo" : "Upload photo"}
                  </button>
                  {avatarPreview && avatarPreview !== user?.avatar && (
                    <button
                      type="button"
                      onClick={() => { setAvatarFile(null); setAvatarPreview(user?.avatar ?? null); }}
                      className="block text-xs text-[#9a8c7a] hover:text-[#c0392b] transition-colors"
                    >
                      Remove
                    </button>
                  )}
                  <p className="text-xs text-[#b8a898]">JPG, PNG or WebP · Max 5 MB</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label htmlFor="settingsUsername" className="block text-sm font-medium text-ink-primary mb-2">
                Username
              </label>
              <input
                id="settingsUsername"
                type="text"
                value={profileForm.username}
                onChange={(e) => { setProfileForm(p => ({ ...p, username: e.target.value })); setProfileError(""); setProfileSuccess(""); }}
                className="w-full px-4 py-3 rounded-lg border border-ink-lightgray text-sm focus:ring-2 focus:ring-ink-gold focus:border-ink-gold transition-all text-ink-gray"
                disabled={profileLoading}
              />
            </div>

            {/* Bio */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="settingsBio" className="block text-sm font-medium text-ink-primary">
                  Bio
                </label>
                <span className={`text-xs font-medium tabular-nums ${
                  bioCharCount > 400 ? "text-red-500" : bioCharCount > 350 ? "text-amber-500" : "text-[#b8a898]"
                }`}>
                  {bioCharCount} / 400
                </span>
              </div>
              <textarea
                id="settingsBio"
                value={profileForm.bio}
                onChange={(e) => { setProfileForm(p => ({ ...p, bio: e.target.value })); setProfileError(""); setProfileSuccess(""); }}
                rows={3}
                placeholder="A few words about you and your writing…"
                className="w-full px-4 py-3 rounded-lg border border-ink-lightgray text-sm focus:ring-2 focus:ring-ink-gold focus:border-ink-gold transition-all text-ink-gray resize-none leading-relaxed"
                disabled={profileLoading}
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label htmlFor="settingsDob" className="block text-sm font-medium text-ink-primary mb-1">
                Date of birth <span className="font-normal text-[#9a8c7a]">(optional)</span>
              </label>
              <p className="text-xs text-[#9a8c7a] mb-2">
                🎂 We'll send you a birthday notification — writers deserve to feel seen.
              </p>
              <input
                id="settingsDob"
                type="date"
                value={profileForm.dateOfBirth}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => { setProfileForm(p => ({ ...p, dateOfBirth: e.target.value })); setProfileError(""); setProfileSuccess(""); }}
                className="w-full px-4 py-3 rounded-lg border border-ink-lightgray text-sm focus:ring-2 focus:ring-ink-gold focus:border-ink-gold transition-all text-ink-gray"
                disabled={profileLoading}
              />
            </div>

            {profileError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-sm text-red-800">{profileError}</p>
              </div>
            )}
            {profileSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <p className="text-sm text-green-800">{profileSuccess}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={profileLoading || bioCharCount > 400}
              className="w-full py-3 px-6 bg-ink-primary text-white text-sm font-medium rounded-xl hover:opacity-90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {profileLoading ? "Saving..." : "Save profile"}
            </button>
          </form>
        </section>

        {/* ─── Discord section — status + unlink only, no link form ─ */}
        {isDiscordLinked && (
          <section className="bg-white rounded-2xl shadow-soft p-6 sm:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#5865F2] flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-serif text-ink-primary">Discord</h2>
                <p className="text-sm text-ink-gray mt-0.5">Your Discord account is connected</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
              <svg className="w-5 h-5 text-green-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-green-800">Discord account linked</p>
                <p className="text-xs text-green-600 mt-0.5 font-mono">{user?.discordId}</p>
              </div>
            </div>

            {discordError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-3">
                <p className="text-sm text-red-800">{discordError}</p>
              </div>
            )}
            {discordSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-3">
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
          </section>
        )}

        {/* ─── Recovery Email ───────────────────────────────────────── */}
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
                Update your Email
              </p>
            </div>
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

        {/* ─── Password section ─────────────────────────────────── */}
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

          {isDiscordOnly && (
            <div className="bg-[#f0f0ff] border border-[#c7c9f9] rounded-xl px-4 py-3 mb-4">
              <p className="text-xs text-[#3b3f9e]">
                <strong>How login works for you:</strong> You joined via Discord, so you can log in using your
                Discord ID as your username and the password you set here. No email needed.
              </p>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
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

        {/* ─── Notification section ─────────────────────────────────── */}
        <NotificationSettings />

        {/* ─── Danger Zone ──────────────────────────────────────────── */}
        <section className="rounded-2xl border-2 border-red-200 bg-white p-6 sm:p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-serif text-red-700">Danger Zone</h2>
              <p className="text-sm text-ink-gray mt-0.5">
                Irreversible actions — please read carefully before proceeding.
              </p>
            </div>
          </div>

          <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-red-100 bg-red-50">
            <div>
              <p className="text-sm font-medium text-ink-primary">Delete account</p>
              <p className="text-xs text-ink-gray mt-1 leading-relaxed">
                Your profile, projects, sprints, and private data will be permanently removed.
                Comments and feedback you left on other writers' work will remain but show as <span className="font-mono font-medium">[deleted]</span>.
              </p>
            </div>
            <button
              onClick={() => { setShowDeleteModal(true); setDeleteError(""); setDeleteConfirmText(""); }}
              className="shrink-0 px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-100 transition-colors"
            >
              Delete account
            </button>
          </div>
        </section>

      </main>

      {/* ─── Delete account confirmation modal ───────────────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => { if (!deleteLoading) setShowDeleteModal(false); }}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-6 sm:p-8 space-y-5">

            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-serif text-ink-primary">Delete your account?</h3>
                <p className="text-sm text-ink-gray mt-0.5">This cannot be undone.</p>
              </div>
            </div>

            {/* What gets deleted vs preserved */}
            <div className="space-y-3 text-sm">
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 space-y-1">
                <p className="font-medium text-red-700 mb-1">Permanently deleted</p>
                <ul className="text-red-600 space-y-0.5 list-disc list-inside text-xs">
                  <li>Your profile, avatar, and bio</li>
                  <li>All projects, sprints, notes, and to-do lists</li>
                  <li>Your notifications and account credentials</li>
                </ul>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 space-y-1">
                <p className="font-medium text-amber-700 mb-1">Preserved (shown as <span className="font-mono">[deleted]</span>)</p>
                <ul className="text-amber-600 space-y-0.5 list-disc list-inside text-xs">
                  <li>Comments you left on blog posts and snippets</li>
                  <li>Feedback and critiques you gave in the Feedback Hub</li>
                  <li>Wall posts you wrote on other members' profiles</li>
                </ul>
              </div>
            </div>

            {/* Confirmation input */}
            <div>
              <label htmlFor="deleteConfirm" className="block text-sm font-medium text-ink-primary mb-2">
                Type <span className="font-mono font-semibold text-red-600">{DELETE_PHRASE}</span> to confirm
              </label>
              <input
                id="deleteConfirm"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => { setDeleteConfirmText(e.target.value); setDeleteError(""); }}
                placeholder={DELETE_PHRASE}
                className="w-full px-4 py-3 rounded-lg border border-ink-lightgray text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400 transition-all text-ink-gray"
                disabled={deleteLoading}
                autoComplete="off"
              />
            </div>

            {deleteError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-sm text-red-800">{deleteError}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
                className="flex-1 py-2.5 px-4 text-sm font-medium text-ink-primary border border-ink-lightgray rounded-xl hover:bg-ink-cream transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading || deleteConfirmText.toLowerCase() !== DELETE_PHRASE}
                className="flex-1 py-2.5 px-4 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleteLoading ? "Deleting…" : "Yes, delete my account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}