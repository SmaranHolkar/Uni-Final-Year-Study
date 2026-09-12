import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "../supabaseClient";
import { Skeleton } from "../components/Skeleton.jsx";
import { useSEO } from "../hooks/useSEO";

// Handles ResetPassword logic with standardized Obsidian Dark design.
export default function ResetPassword() {
  useSEO({
    title: "Reset Password | HydrusLearn",
    description: "Choose a new password for your HydrusLearn account.",
    path: "/reset-password",
    noIndex: true,
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const renderLoadingSkeleton = () => (
    <div className="w-full max-w-md card-standard" aria-hidden>
      <Skeleton style={{ height: '1.45rem', width: '12rem' }} />
      <Skeleton className="mt-2" style={{ height: '0.85rem', width: '11rem' }} />

      <div className="mt-6 space-y-4">
        <div>
          <Skeleton style={{ height: '0.75rem', width: '6rem' }} />
          <Skeleton className="mt-2" rounded="10px" style={{ height: '2.5rem', width: '100%' }} />
        </div>
        <div>
          <Skeleton style={{ height: '0.75rem', width: '7rem' }} />
          <Skeleton className="mt-2" rounded="10px" style={{ height: '2.5rem', width: '100%' }} />
        </div>
        <Skeleton rounded="10px" style={{ height: '2.6rem', width: '100%' }} />
      </div>
    </div>
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!password) {
      return setError("Please enter a new password");
    }

    if (password.length < 8) {
      return setError("Password must be at least 8 characters long");
    }

    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    setLoading(true);

    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setError("Your reset session has expired. Please request a new link.");
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        console.error("Password update error:", updateError);
        setError("Unable to update password. Please try again.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      console.error("Password update error:", err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-12">
      {loading && renderLoadingSkeleton()}

      {!loading && (
        <div className="w-full max-w-md card-standard">
          <h1 className="mb-2 text-2xl font-normal text-[#f0f0ee] tracking-tight">
            Reset your password
          </h1>
          <p className="mb-6 text-sm text-[#a1a1a6]">
            Enter your new secure password below.
          </p>

          {error && (
            <div
              id="reset-password-error"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              className="mb-5 flex items-center gap-2 rounded-[10px] border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300"
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="mb-5 flex items-center gap-2 rounded-[10px] border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300"
            >
              <CheckCircle size={16} />
              <span>Password reset successful! Redirecting to login...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reset-new-password" className="mb-1.5 block text-xs font-medium text-[#f0f0ee]">
                New password
              </label>
              <div className="relative">
                <input
                  id="reset-new-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || success}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "reset-password-error" : undefined}
                  placeholder="Enter new password (min 8 characters)"
                  className="input-standard pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading || success}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-3 flex items-center text-[#a1a1a6] hover:text-[#f0f0ee] transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="reset-confirm-password" className="mb-1.5 block text-xs font-medium text-[#f0f0ee]">
                Confirm new password
              </label>
              <div className="relative">
                <input
                  id="reset-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading || success}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "reset-password-error" : undefined}
                  placeholder="Confirm new password"
                  className="input-standard pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading || success}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  aria-pressed={showConfirmPassword}
                  className="absolute inset-y-0 right-3 flex items-center text-[#a1a1a6] hover:text-[#f0f0ee] transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="btn-primary w-full mt-2"
            >
              {loading ? "Updating password..." : "Update password"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-[#a1a1a6]">
            Remember your password?{" "}
            <Link to="/login" className="text-[#f0f0ee] font-medium hover:underline ml-1">
              Back to login
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
