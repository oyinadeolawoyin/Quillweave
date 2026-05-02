import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./authContext";
import API_URL from "../../config/api";

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
    setServerError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    setIsLoading(true);
    setServerError("");
    
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identifier: formData.email, password: formData.password }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
        // Navigate to dashboard
        navigate("/");
      } else {
        setServerError(
          data.message || "That email or password doesn't look right. Please check and try again."
        );
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
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-ink-primary mb-2 sm:mb-3">
              Welcome Back
            </h1>
            <p className="text-ink-gray text-base sm:text-lg">
              Ready to write today?
            </p>
          </div>

        {/* Server Error */}
        {serverError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 sm:px-4 sm:py-3 rounded-lg mb-4">
            <p className="text-xs sm:text-sm">{serverError}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
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
              className={`w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base rounded-lg border ${
                errors.email 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-ink-lightgray input-focus'
              } bg-white text-ink-gray placeholder-gray-400 transition-all`}
              placeholder="you@example.com"
              disabled={isLoading}
              autoComplete="email"
            />
            {errors.email && (
              <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.email}</p>
            )}
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
                type={showPassword ? "text" : "password"} // toggle here
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 pr-10 text-sm sm:text-base rounded-lg border border-ink-lightgray input-focus bg-white text-ink-gray placeholder-gray-400 transition-all"
                placeholder="At least 6 characters"
                disabled={isLoading}
            />
            
            {/* Eye toggle button */}
            <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-2 sm:right-3 top-8 sm:top-9 text-gray-400 hover:text-gray-700 p-1"
            >
                {showPassword ? "🙈" : "👁️"} {/* you can use icons instead of emoji */}
            </button>
          </div>

          {/* Forgot Password Link */}
          <div className="text-right">
            <Link 
              to="/forgot-password" 
              className="text-xs sm:text-sm text-ink-gray hover:text-ink-primary transition-colors"
            >
              Forgot password?
            </Link>
          </div>

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
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Signup Link */}
        <div className="mt-4 sm:mt-6 text-center">
          <p className="text-xs sm:text-sm text-ink-gray">
            New to Inkwell?{" "}
            <Link 
              to="/signup" 
              className="text-ink-primary font-medium hover:text-ink-gold transition-colors"
            >
              Create an account
            </Link>
          </p>
        </div>

        {/* Gentle reminder */}
        <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-ink-lightgray">
          <p className="text-xs text-center text-gray-500 italic leading-relaxed">
            "You don't have to be great to start, but you have to start to be great."
          </p>
        </div>
      </div>
    </div>
    </div>
  );
}