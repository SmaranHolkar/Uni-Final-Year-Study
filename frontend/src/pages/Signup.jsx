import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { supabase } from "../supabaseClient";

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  async function handleSignup(e) {
    e.preventDefault();
    setError(""); setSuccess("");

    if (!firstName.trim() || !lastName.trim()) return setError("Enter first & last name");
    if (!email.trim()) return setError("Enter your email");
    if (password.length < 6) return setError("Password must be 6+ chars");
    if (!agreedToTerms) return setError("Agree to terms");

    setLoading(true);
    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { first_name: firstName, last_name: lastName } },
      });

      if (signupError) return setError(signupError.message);

      if (data.user) {
        setSuccess("Check your email to confirm your account.");
        setTimeout(() => navigate("/login"), 2000);
      }

    } catch (err) {
      setError(err.message || "Signup failed");
    } finally { setLoading(false); }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <div
        className="w-full max-w-md sm:max-w-lg md:max-w-md p-6 sm:p-8 rounded-2xl shadow-xl"
        style={{ background: "var(--card)", color: "var(--card-foreground)" }}
      >
        <h1 className="text-2xl sm:text-3xl font-semibold text-center">Create Account</h1>
        <p className="text-center opacity-70 mb-6 text-sm sm:text-base">
          Welcome! Start your journey.
        </p>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-md mb-4 text-sm sm:text-base"
            style={{ background: "var(--destructive)", color: "var(--destructive-foreground)" }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {success && (
          <div className="p-3 rounded-md mb-4 text-center font-medium text-sm sm:text-base"
            style={{ background:"var(--primary)", color:"var(--primary-foreground)" }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          
          {/* First/Last name → stacks on mobile */}
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              className="flex-1 px-3 py-2 rounded-md border bg-[var(--input)] text-[var(--foreground)] placeholder-gray-300 outline-none"
              style={{ borderColor: "var(--border)" }}
              placeholder="First name"
              value={firstName}
              onChange={(e)=>setFirstName(e.target.value)}
            />
            <input
              className="flex-1 px-3 py-2 rounded-md border bg-[var(--input)] text-[var(--foreground)] placeholder-gray-300 outline-none"
              style={{ borderColor: "var(--border)" }}
              placeholder="Last name"
              value={lastName}
              onChange={(e)=>setLastName(e.target.value)}
            />
          </div>

          <input
            className="w-full px-3 py-2 rounded-md border bg-[var(--input)] text-[var(--foreground)] placeholder-gray-300 outline-none"
            style={{ borderColor: "var(--border)" }}
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="w-full px-3 py-2 rounded-md border bg-[var(--input)] text-[var(--foreground)] placeholder-gray-300 outline-none"
              style={{ borderColor:"var(--border)" }}
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-3 top-2.5 opacity-70 hover:opacity-100"
              onClick={()=>setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm sm:text-base">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e)=>setAgreedToTerms(e.target.checked)}
              className="h-4 w-4"
            />
            <span>I agree to the <b>Terms & Conditions</b></span>
          </label>

          <button
            className="w-full py-2 rounded-md font-semibold text-sm sm:text-base mt-2 transition hover:scale-[1.02]"
            style={{ background:"var(--primary)", color:"var(--primary-foreground)" }}
          >
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>

        <p className="text-center mt-4 text-sm sm:text-base opacity-80">
          Already have an account?{" "}
          <a href="/login" className="font-medium hover:underline"
            style={{ color:"var(--primary)" }}>Login</a>
        </p>
      </div>
    </div>
  );
}
