import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signUpError, setSignUpError] = useState(null);
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setSignUpError(error.message || "An unexpected error occurred. Check your connection.");
    } else {
      setSignUpError(null);
      navigate("/create-profile");
    }
  };

  return (
    <div className="scanlines min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black tracking-tight text-white font-mono">
            FANTASY<span className="text-emerald-400">STOCKS</span>
          </h1>
          <p className="text-zinc-600 text-xs font-mono mt-1 tracking-widest">
            MARKET INTELLIGENCE FOR THE MODERN LEAGUE
          </p>
        </div>

        {/* Card */}
        <div className="relative bg-zinc-950 border border-zinc-800 rounded-lg p-8 glow-border accent-top">
          <p className="text-xs font-mono text-emerald-500 tracking-widest uppercase mb-6">
            // NEW_USER_REGISTRATION
          </p>

          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-zinc-500 tracking-wider mb-1 uppercase">
                Email Address
              </label>
              <input
                type="email"
                placeholder="trader@example.com"
                className="w-full bg-black border border-zinc-800 focus:border-emerald-500 text-emerald-400 font-mono px-3 py-2.5 rounded text-sm outline-none transition-colors placeholder:text-zinc-700"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-500 tracking-wider mb-1 uppercase">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full bg-black border border-zinc-800 focus:border-emerald-500 text-emerald-400 font-mono px-3 py-2.5 rounded text-sm outline-none transition-colors placeholder:text-zinc-700"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full border border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-black font-mono text-xs py-3 rounded tracking-widest uppercase transition-all duration-200 mt-2"
            >
              Initialize Account
            </button>

            {signUpError && (
              <p className="text-red-400 text-xs font-mono text-center mt-2 border border-red-900 bg-red-950/30 rounded px-3 py-2">
                ERR: {signUpError}
              </p>
            )}
          </form>

          <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
            <span className="text-zinc-600 text-xs font-mono">EXISTING USER? </span>
            <a href="/signin" className="text-emerald-400 text-xs font-mono hover:text-emerald-300 tracking-wider">
              SIGN_IN →
            </a>
          </div>
        </div>

        <p className="text-center text-zinc-700 text-xs font-mono mt-6">
          ● SYSTEM ONLINE — v2.0.0
        </p>
      </div>
    </div>
  );
};

export default SignUp;
