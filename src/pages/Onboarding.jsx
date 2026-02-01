import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";

const Onboarding = () => {
  const { user, uploadAvatar } = useAuth();
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const skillLevels = [
    {
      value: "beginner",
      title: "Beginner",
      description: "Just learning the rules and basic moves",
      icon: "🌱",
      color: "from-green-500 to-green-600",
    },
    {
      value: "intermediate",
      title: "Intermediate",
      description: "Know tactics, play regularly, understand strategy",
      icon: "⚡",
      color: "from-yellow-500 to-orange-500",
    },
    {
      value: "expert",
      title: "Expert",
      description: "Strong player with deep game understanding",
      icon: "🏆",
      color: "from-purple-500 to-pink-500",
    },
  ];

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be less than 2MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    setAvatarFile(file);
    setError("");

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUsernameSubmit = () => {
    if (!username.trim()) {
      setError("Username is required");
      return;
    }
    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }
    if (username.length > 20) {
      setError("Username must be less than 20 characters");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError("Username can only contain letters, numbers, and underscores");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleComplete = async () => {
    if (!selectedLevel) {
      setError("Please select your skill level");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let avatarUrl = "";
      let avatarPath = "";

      // Upload avatar if selected
      if (avatarFile) {
        const { data, error: uploadError } = await uploadAvatar(avatarFile);
        if (uploadError) {
          console.error("Avatar upload error:", uploadError);
        } else {
          avatarUrl = data.url;
          avatarPath = data.path;
        }
      }

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          username: username.trim(),
          skill_level: selectedLevel,
          avatar_url: avatarUrl,
          avatar_path: avatarPath,
          onboarded: true,
          onboarded_at: new Date().toISOString(),
        },
      });

      if (updateError) throw updateError;

      // Initialize leaderboard entry
      const { error: leaderboardError } = await supabase
        .from("leaderboards")
        .upsert({
          user_id: user.id,
          username: username.trim(),
          ai_points: 0,
          ai_games_played: 0,
          multiplayer_points: 0,
          multiplayer_games_played: 0,
        }, { onConflict: 'user_id' });

      if (leaderboardError) {
        console.error("Leaderboard init error:", leaderboardError);
      }

      navigate("/");
    } catch (err) {
      console.error("Error completing onboarding:", err);
      setError("Failed to complete setup: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      <div className="w-full max-w-2xl">
        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-primary-500 text-white' : 'bg-white/10 text-gray-400'}`}>
            1
          </div>
          <div className={`w-20 h-1 ${step >= 2 ? 'bg-primary-500' : 'bg-white/10'}`}></div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-primary-500 text-white' : 'bg-white/10 text-gray-400'}`}>
            2
          </div>
        </div>

        {/* Step 1: Username & Avatar */}
        {step === 1 && (
          <div className="card">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">♔</div>
              <h1 className="text-3xl font-bold text-gradient from-primary-400 to-accent-400 mb-2">
                Welcome to Chess Arena!
              </h1>
              <p className="text-gray-400">Let's set up your profile</p>
            </div>

            {/* Avatar Selection */}
            <div className="flex flex-col items-center mb-8">
              <div 
                className="relative group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar Preview"
                    className="w-28 h-28 rounded-full object-cover border-4 border-primary-500/50"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-4xl font-bold border-4 border-primary-500/50">
                    {username?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-sm">📷 Upload</span>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <p className="text-xs text-gray-400 mt-2">Click to upload photo (optional)</p>
            </div>

            {/* Username Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Choose your username <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter a unique username"
                className="input w-full text-lg"
                maxLength={20}
              />
              <p className="text-xs text-gray-400 mt-2">
                3-20 characters, letters, numbers, and underscores only
              </p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleUsernameSubmit}
              className="btn-primary w-full text-lg"
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 2: Skill Level */}
        {step === 2 && (
          <div className="card">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gradient from-primary-400 to-accent-400 mb-2">
                What's your skill level?
              </h1>
              <p className="text-gray-400">
                This helps us match you with appropriate opponents and set AI difficulty
              </p>
            </div>

            <div className="space-y-4 mb-8">
              {skillLevels.map((level) => (
                <button
                  key={level.value}
                  onClick={() => setSelectedLevel(level.value)}
                  className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                    selectedLevel === level.value
                      ? `border-primary-500 bg-primary-500/20`
                      : "border-white/10 hover:border-white/30 bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${level.color} flex items-center justify-center text-2xl`}>
                      {level.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{level.title}</h3>
                      <p className="text-gray-400 text-sm">{level.description}</p>
                    </div>
                    {selectedLevel === level.value && (
                      <div className="ml-auto text-primary-400 text-2xl">✓</div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="btn-secondary flex-1"
              >
                ← Back
              </button>
              <button
                onClick={handleComplete}
                disabled={!selectedLevel || loading}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {loading ? "Setting up..." : "Enter the Arena! 🎮"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
