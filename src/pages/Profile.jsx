import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";

const Profile = () => {
  const { user, updateProfile, uploadAvatar, deleteAvatar } = useAuth();
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);
  
  // Profile data
  const [profile, setProfile] = useState({
    username: "",
    skill_level: "",
    avatar_url: "",
    avatar_path: "",
  });

  // Game statistics
  const [stats, setStats] = useState({
    totalGames: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    winRate: 0,
    aiGames: 0,
    multiplayerGames: 0,
    aiWins: 0,
    multiplayerWins: 0,
  });

  // Leaderboard positions
  const [leaderboardStats, setLeaderboardStats] = useState({
    aiRank: null,
    multiplayerRank: null,
    aiPoints: 0,
    multiplayerPoints: 0,
  });

  // Records
  const [records, setRecords] = useState({
    bestWinStreak: 0,
    currentStreak: 0,
    fastestWin: null,
    mostPiecesRemaining: null,
  });

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchProfile(),
      fetchGameStats(),
      fetchLeaderboardPosition(),
    ]);
    setLoading(false);
  };

  const fetchProfile = () => {
    const metadata = user?.user_metadata || {};
    setProfile({
      username: metadata.username || "",
      skill_level: metadata.skill_level || "",
      avatar_url: metadata.avatar_url || "",
      avatar_path: metadata.avatar_path || "",
    });
    setAvatarPreview(metadata.avatar_url || null);
  };

  const fetchGameStats = async () => {
    try {
      const { data: games, error } = await supabase
        .from("games")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;

      if (games && games.length > 0) {
        const aiGames = games.filter(g => g.game_mode === "ai" || g.game_mode === "computer");
        const multiplayerGames = games.filter(g => g.game_mode === "multiplayer");
        
        const wins = games.filter(g => g.result === "win").length;
        const losses = games.filter(g => g.result === "loss").length;
        const draws = games.filter(g => g.result === "draw").length;

        setStats({
          totalGames: games.length,
          wins,
          losses,
          draws,
          winRate: games.length > 0 ? Math.round((wins / games.length) * 100) : 0,
          aiGames: aiGames.length,
          multiplayerGames: multiplayerGames.length,
          aiWins: aiGames.filter(g => g.result === "win").length,
          multiplayerWins: multiplayerGames.filter(g => g.result === "win").length,
        });

        // Calculate records (streaks, etc.)
        calculateRecords(games);
      }
    } catch (error) {
      console.error("Error fetching game stats:", error);
    }
  };

  const calculateRecords = (games) => {
    // Sort games by date
    const sortedGames = games.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Calculate win streak
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    
    for (const game of sortedGames) {
      if (game.result === "win") {
        tempStreak++;
        if (tempStreak > bestStreak) bestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }

    // Current streak (from most recent games)
    for (const game of sortedGames) {
      if (game.result === "win") {
        currentStreak++;
      } else {
        break;
      }
    }

    setRecords({
      bestWinStreak: bestStreak,
      currentStreak: currentStreak,
      fastestWin: null, // Would need game duration data
      mostPiecesRemaining: null, // Would need piece count data
    });
  };

  const fetchLeaderboardPosition = async () => {
    try {
      // Get user's leaderboard entry
      const { data: userEntry, error: userError } = await supabase
        .from("leaderboards")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        throw userError;
      }

      if (userEntry) {
        // Get AI rank
        const { count: aiRank } = await supabase
          .from("leaderboards")
          .select("*", { count: "exact", head: true })
          .gt("ai_points", userEntry.ai_points);

        // Get Multiplayer rank
        const { count: mpRank } = await supabase
          .from("leaderboards")
          .select("*", { count: "exact", head: true })
          .gt("multiplayer_points", userEntry.multiplayer_points);

        setLeaderboardStats({
          aiRank: (aiRank || 0) + 1,
          multiplayerRank: (mpRank || 0) + 1,
          aiPoints: userEntry.ai_points || 0,
          multiplayerPoints: userEntry.multiplayer_points || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching leaderboard position:", error);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result);
      reader.readAsDataURL(file);

      if (profile.avatar_path) {
        await deleteAvatar(profile.avatar_path);
      }

      const { data, error } = await uploadAvatar(file);
      if (error) throw error;

      const updatedProfile = {
        ...profile,
        avatar_url: data.url,
        avatar_path: data.path,
      };

      setProfile(updatedProfile);
      await updateProfile(updatedProfile);
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Failed to upload avatar: " + error.message);
      setAvatarPreview(profile.avatar_url || null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const skillLevelInfo = {
    beginner: { label: "Beginner", icon: "🌱", color: "text-green-400" },
    intermediate: { label: "Intermediate", icon: "⚡", color: "text-yellow-400" },
    expert: { label: "Expert", icon: "🏆", color: "text-purple-400" },
  };

  const currentSkill = skillLevelInfo[profile.skill_level] || skillLevelInfo.beginner;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <div className="card mb-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative group">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-primary-500/50"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-5xl font-bold border-4 border-primary-500/50">
                  {profile.username?.[0]?.toUpperCase() || "?"}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 bg-primary-500 hover:bg-primary-600 rounded-full p-2 transition-colors"
              >
                📷
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            {/* User Info */}
            <div className="text-center md:text-left flex-1">
              <h1 className="text-4xl font-bold mb-2">{profile.username || "Player"}</h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-3">
                <span className={`${currentSkill.color} font-semibold`}>
                  {currentSkill.icon} {currentSkill.label}
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-400">{user?.email}</span>
              </div>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm">
                <div className="bg-white/5 px-4 py-2 rounded-lg">
                  <span className="text-gray-400">Member since </span>
                  <span className="text-white font-semibold">
                    {new Date(user?.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-4">
              <div className="text-center bg-white/5 px-6 py-4 rounded-xl">
                <div className="text-3xl font-bold text-green-400">{stats.wins}</div>
                <div className="text-sm text-gray-400">Wins</div>
              </div>
              <div className="text-center bg-white/5 px-6 py-4 rounded-xl">
                <div className="text-3xl font-bold text-red-400">{stats.losses}</div>
                <div className="text-sm text-gray-400">Losses</div>
              </div>
              <div className="text-center bg-white/5 px-6 py-4 rounded-xl">
                <div className="text-3xl font-bold text-primary-400">{stats.winRate}%</div>
                <div className="text-sm text-gray-400">Win Rate</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leaderboard Rankings */}
          <div className="card">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              🏅 Leaderboard Rankings
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl p-5 border border-blue-500/30">
                <div className="text-blue-400 text-sm font-semibold mb-2">AI Battles</div>
                <div className="text-4xl font-bold mb-1">
                  #{leaderboardStats.aiRank || "—"}
                </div>
                <div className="text-gray-400 text-sm">
                  {leaderboardStats.aiPoints.toLocaleString()} points
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl p-5 border border-purple-500/30">
                <div className="text-purple-400 text-sm font-semibold mb-2">Multiplayer</div>
                <div className="text-4xl font-bold mb-1">
                  #{leaderboardStats.multiplayerRank || "—"}
                </div>
                <div className="text-gray-400 text-sm">
                  {leaderboardStats.multiplayerPoints.toLocaleString()} points
                </div>
              </div>
            </div>
          </div>

          {/* Game Statistics */}
          <div className="card">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              📊 Game Statistics
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <span className="text-gray-400">Total Games Played</span>
                <span className="font-bold text-xl">{stats.totalGames}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <span className="text-gray-400">vs AI Games</span>
                <span className="font-bold">{stats.aiGames} <span className="text-green-400">({stats.aiWins} wins)</span></span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <span className="text-gray-400">Multiplayer Games</span>
                <span className="font-bold">{stats.multiplayerGames} <span className="text-green-400">({stats.multiplayerWins} wins)</span></span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <span className="text-gray-400">Draws</span>
                <span className="font-bold text-yellow-400">{stats.draws}</span>
              </div>
            </div>
          </div>

          {/* Records & Achievements */}
          <div className="card">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              🏆 Personal Records
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <div className="text-3xl mb-2">🔥</div>
                <div className="text-2xl font-bold text-orange-400">{records.bestWinStreak}</div>
                <div className="text-sm text-gray-400">Best Win Streak</div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <div className="text-3xl mb-2">⚡</div>
                <div className="text-2xl font-bold text-yellow-400">{records.currentStreak}</div>
                <div className="text-sm text-gray-400">Current Streak</div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <div className="text-3xl mb-2">⏱️</div>
                <div className="text-2xl font-bold text-blue-400">{records.fastestWin || "—"}</div>
                <div className="text-sm text-gray-400">Fastest Win</div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <div className="text-3xl mb-2">♟️</div>
                <div className="text-2xl font-bold text-green-400">{records.mostPiecesRemaining || "—"}</div>
                <div className="text-sm text-gray-400">Most Pieces Left</div>
              </div>
            </div>
          </div>

          {/* Win/Loss Breakdown */}
          <div className="card">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              📈 Performance
            </h2>
            
            {/* Win Rate Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Win Rate</span>
                <span className="font-bold text-primary-400">{stats.winRate}%</span>
              </div>
              <div className="h-4 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                  style={{ width: `${stats.winRate}%` }}
                />
              </div>
            </div>

            {/* Game Results Breakdown */}
            <div className="flex gap-2 h-8 rounded-lg overflow-hidden mb-4">
              {stats.wins > 0 && (
                <div 
                  className="bg-green-500 flex items-center justify-center text-xs font-bold"
                  style={{ width: `${(stats.wins / stats.totalGames) * 100}%` }}
                >
                  {stats.wins}W
                </div>
              )}
              {stats.draws > 0 && (
                <div 
                  className="bg-yellow-500 flex items-center justify-center text-xs font-bold"
                  style={{ width: `${(stats.draws / stats.totalGames) * 100}%` }}
                >
                  {stats.draws}D
                </div>
              )}
              {stats.losses > 0 && (
                <div 
                  className="bg-red-500 flex items-center justify-center text-xs font-bold"
                  style={{ width: `${(stats.losses / stats.totalGames) * 100}%` }}
                >
                  {stats.losses}L
                </div>
              )}
            </div>

            <div className="flex justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-400">Wins</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-gray-400">Draws</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-gray-400">Losses</span>
              </div>
            </div>
          </div>
        </div>

        {/* Season Info (Placeholder) */}
        <div className="card mt-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            🗓️ Season Records
          </h2>
          <div className="bg-white/5 rounded-xl p-6 text-center">
            <div className="text-6xl mb-4">🎮</div>
            <h3 className="text-xl font-bold mb-2">Season 1 - Active</h3>
            <p className="text-gray-400 mb-4">
              Compete in ranked matches to climb the leaderboard and earn seasonal rewards!
            </p>
            <div className="flex justify-center gap-8">
              <div>
                <div className="text-2xl font-bold text-primary-400">{leaderboardStats.aiPoints + leaderboardStats.multiplayerPoints}</div>
                <div className="text-sm text-gray-400">Total Season Points</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">{stats.wins}</div>
                <div className="text-sm text-gray-400">Season Wins</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
