import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./authContext";
import API_URL from "../../config/api";
import { 
    EyeIcon, EyeOffIcon
} from "lucide-react";
import TimezoneSelect from 'react-timezone-select';

export default function Signup() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    timezone: "",
    referralSource: "",
  });

  // Tracks which option is selected in the dropdown (separate from
  // formData.referralSource, since when "Other" is picked the actual
  // referralSource value becomes whatever the user types)
  const [referralOption, setReferralOption] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  // Auto-detect timezone on component mount
  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setFormData(prev => ({ ...prev, timezone: detected }));
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setServerError("");
  }

  function handleReferralOptionChange(e) {
    const { value } = e.target;
    setReferralOption(value);
    setServerError("");

    if (value === "other") {
      // Clear it so the user has to type their own answer,
      // and so we don't accidentally submit "other" as the value
      setFormData(prev => ({ ...prev, referralSource: "" }));
    } else {
      setFormData(prev => ({ ...prev, referralSource: value }));
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
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
          

      const data = await res.json();

      if (res.ok) {
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate(`/profile/${data.user.id}?welcome=1`); // Redirect after successful signup
      } else {
        // Handle both array of errors and single message
        if (data.errors && Array.isArray(data.errors)) {
          // Multiple validation errors - show them as a list
          setServerError(data.errors.join(" "));
        } else {
          // Single error message
          setServerError(data.message || "Something went wrong. Please try again.");
        }
      }
    } catch (error) {
      setServerError("We couldn't connect to the server. Please check your internet connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8 bg-gradient-to-b from-[#fafaf9] to-white">
      <div className="w-full max-w-md space-y-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 lg:p-10">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif mb-2 sm:mb-3">
              Welcome to Inkwell
            </h1>
            <p className="text-ink-gray text-base sm:text-lg">
              A home for writers with more ideas than finished drafts.
            </p>
          </div>

        {/* Server Error */}
        {serverError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 sm:px-4 sm:py-3 rounded-lg mb-4">
            {serverError.includes('.') && serverError.split('.').length > 2 ? (
              // Multiple errors - show as bullet points
              <ul className="text-xs sm:text-sm list-disc list-inside space-y-1">
                {serverError.split('.').filter(err => err.trim()).map((error, i) => (
                  <li key={i}>{error.trim()}</li>
                ))}
              </ul>
            ) : (
              // Single error - show as text
              <p className="text-xs sm:text-sm">{serverError}</p>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* Username */}
          <div>
            <label 
              htmlFor="username" 
              className="block text-xs sm:text-sm font-medium text-ink-primary mb-1 sm:mb-2"
            >
              What should we call you?
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base rounded-lg border border-ink-lightgray input-focus bg-white text-ink-gray placeholder-gray-400 transition-all"
              placeholder="Your pen name"
              required
              disabled={isLoading}
            />
          </div>

          {/* Email */}
          <div>
            <label 
              htmlFor="email" 
              className="block text-xs sm:text-sm font-medium text-ink-primary mb-1 sm:mb-2"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base rounded-lg border border-ink-lightgray input-focus bg-white text-ink-gray placeholder-gray-400 transition-all"
              placeholder="you@example.com"
              required
              disabled={isLoading}
            />
          </div>

          {/* Password */}
          <div className="relative">
            <label 
                htmlFor="password" 
                className="block text-xs sm:text-sm font-medium text-ink-primary mb-1 sm:mb-2"
            >
                Password
            </label>
            <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 pr-10 text-sm sm:text-base rounded-lg border border-ink-lightgray input-focus bg-white text-ink-gray placeholder-gray-400 transition-all"
                placeholder="At least 6 characters"
                required
                disabled={isLoading}
            />
            
            {/* Eye toggle button */}
            <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-2 sm:right-3 top-8 sm:top-9 text-gray-400 hover:text-gray-700 p-1"
            >
                {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          {/* Timezone */}
          <div>
            <label 
              htmlFor="timezone" 
              className="block text-xs sm:text-sm font-medium text-ink-primary mb-1 sm:mb-2"
            >
              Your timezone <span className="text-red-500">*</span>
            </label>
            <TimezoneSelect
              value={formData.timezone}
              onChange={(tz) => setFormData(prev => ({ ...prev, timezone: tz.value }))}
              className="text-sm sm:text-base"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 We auto-detected your timezone. Change it if incorrect.
            </p>
          </div>

          {/* How did you find us */}
          <div>
            <label
              htmlFor="referralSource"
              className="block text-xs sm:text-sm font-medium text-ink-primary mb-1 sm:mb-2"
            >
              How did you find Quillweave?
            </label>
            <select
              id="referralSource"
              name="referralSource"
              value={referralOption}
              onChange={handleReferralOptionChange}
              disabled={isLoading}
              required
              className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base rounded-lg border border-ink-lightgray input-focus bg-white text-ink-gray transition-all"
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

          {/* If "Other" selected, let the user type their own answer */}
          {referralOption === "other" && (
            <div>
              <label
                htmlFor="referralSource"
                className="block text-xs sm:text-sm font-medium text-ink-primary mb-1 sm:mb-2"
              >
                Please tell us where you heard about Inkwell
              </label>
              <input
                type="text"
                id="referralSource"
                name="referralSource"
                value={formData.referralSource}
                onChange={handleChange}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base rounded-lg border border-ink-lightgray input-focus bg-white text-ink-gray placeholder-gray-400 transition-all"
                placeholder="e.g. a podcast, a blog post, a friend's recommendation..."
                required
                disabled={isLoading}
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base py-2.5 sm:py-3"
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
              "Start Writing"
            )}
          </button>
        </form>

        {/* Login Link */}
        <div className="mt-4 sm:mt-6 text-center">
          <p className="text-xs sm:text-sm text-ink-gray">
            Already have an account?{" "}
            <Link 
              to="/login" 
              className="text-ink-primary font-medium hover:text-ink-gold transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Gentle reminder */}
        <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-ink-lightgray">
          <p className="text-xs text-center text-gray-500 italic leading-relaxed">
            "The first draft is just you telling yourself the story." <br className="hidden sm:block" />
            — Terry Pratchett
          </p>
        </div>
      </div>
    </div>
    </div>
  );
}