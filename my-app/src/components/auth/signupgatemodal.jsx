// src/components/draftplan/signupGateModal.jsx
// A signup gate shown as a modal overlay right before the final submit of
// the Draft Plan / Days Challenge wizards. Lets a guest finish answering
// every question first, then asks them to create an account, then hands
// control back to the caller (via onSignedUp) to actually create the
// plan/challenge using the answers already collected.
//
// This intentionally mirrors src/components/auth/signup.jsx field-for-field
// (username, email, password, timezone, referralSource) so guests get the
// exact same signup behavior/validation whether they arrive here or via
// the standalone /signup page — just without leaving the wizard.

import { useState, useEffect } from "react";
import API_URL from "../../config/api";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import TimezoneSelect from "react-timezone-select";
import { useAuth } from "../auth/authContext";

export default function SignupGateModal({
  title = "Create your free account",
  message = "Your answers are saved — just create an account to see your plan.",
  onClose,
  onSignedUp, // called with the signed-up user object
}) {
  const { setUser } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    timezone: "",
    referralSource: "",
  });
  const [referralOption, setReferralOption] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setFormData((prev) => ({ ...prev, timezone: detected }));
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setServerError("");
  }

  function handleReferralOptionChange(e) {
    const { value } = e.target;
    setReferralOption(value);
    setServerError("");
    if (value === "other") {
      setFormData((prev) => ({ ...prev, referralSource: "" }));
    } else {
      setFormData((prev) => ({ ...prev, referralSource: value }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setIsLoading(true);
    setServerError("");

    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
        onSignedUp?.(data.user);
      } else {
        if (data.errors && Array.isArray(data.errors)) {
          setServerError(data.errors.join(" "));
        } else {
          setServerError(data.message || "Something went wrong. Please try again.");
        }
        setIsLoading(false);
      }
    } catch (error) {
      setServerError("We couldn't connect to the server. Please check your internet connection and try again.");
      setIsLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 overflow-y-auto"
      style={{ background: "rgba(26,26,46,0.55)" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 my-auto relative">
        {!isLoading && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 text-[#9a8c7a] hover:text-[#1a1a2e] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}

        <div className="text-center mb-5">
          <div
            className="w-11 h-11 rounded-full mx-auto mb-3 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#d4af37,#f0d060)" }}
          >
            <span className="text-[#1a1a2e] text-lg">✦</span>
          </div>
          <h3 className="font-serif text-xl text-[#1a1a2e] mb-1.5">{title}</h3>
          <p className="text-[13px] text-[#6b5c4a] leading-relaxed">{message}</p>
        </div>

        {serverError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 sm:px-4 sm:py-3 rounded-lg mb-4">
            {serverError.includes(".") && serverError.split(".").length > 2 ? (
              <ul className="text-xs sm:text-sm list-disc list-inside space-y-1">
                {serverError.split(".").filter((err) => err.trim()).map((err, i) => (
                  <li key={i}>{err.trim()}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs sm:text-sm">{serverError}</p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label htmlFor="gate-username" className="block text-xs sm:text-sm font-medium text-ink-primary mb-1">
              What should we call you?
            </label>
            <input
              type="text"
              id="gate-username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base rounded-lg border border-ink-lightgray input-focus bg-white text-ink-gray placeholder-gray-400 transition-all"
              placeholder="Your pen name"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="gate-email" className="block text-xs sm:text-sm font-medium text-ink-primary mb-1">
              Email
            </label>
            <input
              type="email"
              id="gate-email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base rounded-lg border border-ink-lightgray input-focus bg-white text-ink-gray placeholder-gray-400 transition-all"
              placeholder="you@example.com"
              required
              disabled={isLoading}
            />
          </div>

          <div className="relative">
            <label htmlFor="gate-password" className="block text-xs sm:text-sm font-medium text-ink-primary mb-1">
              Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              id="gate-password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 sm:px-4 sm:py-2.5 pr-10 text-sm sm:text-base rounded-lg border border-ink-lightgray input-focus bg-white text-ink-gray placeholder-gray-400 transition-all"
              placeholder="At least 6 characters"
              required
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2 sm:right-3 top-7 sm:top-8 text-gray-400 hover:text-gray-700 p-1"
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          <div>
            <label htmlFor="gate-timezone" className="block text-xs sm:text-sm font-medium text-ink-primary mb-1">
              Your timezone <span className="text-red-500">*</span>
            </label>
            <TimezoneSelect
              value={formData.timezone}
              onChange={(tz) => setFormData((prev) => ({ ...prev, timezone: tz.value }))}
              className="text-sm sm:text-base"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">💡 We auto-detected your timezone. Change it if incorrect.</p>
          </div>

          <div>
            <label htmlFor="gate-referralSource" className="block text-xs sm:text-sm font-medium text-ink-primary mb-1">
              How did you find Quillweave?
            </label>
            <select
              id="gate-referralSource"
              name="referralSource"
              value={referralOption}
              onChange={handleReferralOptionChange}
              disabled={isLoading}
              required
              className="w-full px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base rounded-lg border border-ink-lightgray input-focus bg-white text-ink-gray transition-all"
            >
              <option value="">Select an option…</option>
              <option value="twitter">Twitter / X</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="discord">Discord</option>
              <option value="reddit">Reddit</option>
              <option value="friend">A friend told me</option>
              <option value="search">Search engine (Google etc.)</option>
              <option value="other">Other</option>
            </select>
          </div>

          {referralOption === "other" && (
            <div>
              <label htmlFor="gate-referralSource-other" className="block text-xs sm:text-sm font-medium text-ink-primary mb-1">
                Please tell us where you heard about Quillweave
              </label>
              <input
                type="text"
                id="gate-referralSource-other"
                name="referralSource"
                value={formData.referralSource}
                onChange={handleChange}
                className="w-full px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base rounded-lg border border-ink-lightgray input-focus bg-white text-ink-gray placeholder-gray-400 transition-all"
                placeholder="e.g. a podcast, a blog post, a friend's recommendation..."
                required
                disabled={isLoading}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base py-2.5 sm:py-3 mt-1"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating your account...
              </span>
            ) : (
              "Create my account"
            )}
          </button>
        </form>

        {!isLoading && (
          <button
            type="button"
            onClick={onClose}
            className="w-full mt-3 text-center text-[12px] text-[#9a8c7a] hover:text-[#1a1a2e] transition-colors py-1"
          >
            Not yet — keep editing my answers
          </button>
        )}
      </div>
    </div>
  );
}