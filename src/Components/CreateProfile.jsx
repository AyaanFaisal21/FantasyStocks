import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "../supabaseClient";
import { UserAuth } from "../context/AuthContext";

const CreateProfile = () => {
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { session } = UserAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("Display name cannot be empty.");
      return;
    }
    const { user } = session;
    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert({ id: user.id, display_name: displayName }, { onConflict: "id" });

    if (upsertError) {
      setError(upsertError.message);
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="scanlines min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black tracking-tight text-white font-mono">
            FANTASY<span className="text-emerald-400">STOCKS</span>
          </h1>
          <p className="text-zinc-600 text-xs font-mono mt-1 tracking-widest">
            PROFILE CONFIGURATION
          </p>
        </div>

        <div className="relative bg-zinc-950 border border-zinc-800 rounded-lg p-8 glow-border accent-top">
          <p className="text-xs font-mono text-emerald-500 tracking-widest uppercase mb-2">
            // CONFIGURE_USER_PROFILE
          </p>
          <p className="text-zinc-500 text-xs font-mono mb-6">
            Choose a display name visible to your league.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-zinc-500 tracking-wider mb-1 uppercase">
                Display Name
              </label>
              <input
                type="text"
                placeholder="e.g. WallStreetWolf"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-black border border-zinc-800 focus:border-emerald-500 text-emerald-400 font-mono px-3 py-2.5 rounded text-sm outline-none transition-colors placeholder:text-zinc-700"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs font-mono border border-red-900 bg-red-950/30 rounded px-3 py-2">
                ERR: {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full border border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-black font-mono text-xs py-3 rounded tracking-widest uppercase transition-all duration-200"
            >
              Confirm &amp; Enter Dashboard
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateProfile;
