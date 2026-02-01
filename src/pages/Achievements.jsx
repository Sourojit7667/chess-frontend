import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";

const Achievements = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("multiplayer");
  const [badges, setBadges] = useState([]);
  const [streaks, setStreaks] = useState({ current: 0, best: 0 });
  const [loading, setLoading] = useState(true);

  const fetchAchievements = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch badges
      const { data: badgeData } = await supabase
        .from("badges")
        .select(
          `
          *,
          seasons (season_number, start_date, end_date)
        `,
        )
        .eq("user_id", user.id)
        .eq("leaderboard_type", activeTab)
        .order("season_id", { ascending: false });

      setBadges(badgeData || []);

      // Fetch streaks
      const { data: streakData } = await supabase
        .from("streaks")
        .select("*")
        .eq("user_id", user.id)
        .eq("leaderboard_type", activeTab)
        .single();

      if (streakData) {
        setStreaks({
          current: streakData.current_streak || 0,
          best: streakData.best_streak || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching achievements:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, user]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  const getBadgeColor = (rankTier, leaderboardType) => {
    const colors = {
      multiplayer: {
        top_10: "from-yellow-500 to-amber-500",
        top_50: "from-purple-500 to-pink-500",
        top_100: "from-blue-500 to-cyan-500",
        top_200: "from-green-500 to-emerald-500",
      },
      ai: {
        top_10: "from-orange-500 to-red-500",
        top_50: "from-pink-500 to-rose-500",
        top_100: "from-indigo-500 to-purple-500",
        top_200: "from-teal-500 to-green-500",
      },
    };
    return colors[leaderboardType]?.[rankTier] || "from-gray-500 to-gray-600";
  };

  const getBadgeIcon = (rankTier) => {
    const icons = {
      top_10: "🏆",
      top_50: "🥈",
      top_100: "🥉",
      top_200: "⭐",
    };
    return icons[rankTier] || "🎖️";
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-gradient from-primary-400 to-accent-400">
          Achievements
        </h1>

        {/* Tabs */}
        <div className="flex mb-6 glass rounded-lg p-1">
          <button
            onClick={() => setActiveTab("multiplayer")}
            className={`flex-1 py-3 rounded-md transition-all font-semibold ${
              activeTab === "multiplayer"
                ? "bg-multiplayer-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            🌍 Multiplayer
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`flex-1 py-3 rounded-md transition-all font-semibold ${
              activeTab === "ai"
                ? "bg-ai-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            🤖 Versus Computer
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
          </div>
        ) : (
          <>
            {/* Streaks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="card text-center">
                <div className="text-5xl mb-2">🔥</div>
                <div className="text-4xl font-bold text-primary-400 mb-2">
                  {streaks.current}
                </div>
                <div className="text-gray-400">Current Streak</div>
                <p className="text-sm text-gray-500 mt-2">
                  Consecutive seasons in Top 200+
                </p>
              </div>
              <div className="card text-center">
                <div className="text-5xl mb-2">⚡</div>
                <div className="text-4xl font-bold text-accent-400 mb-2">
                  {streaks.best}
                </div>
                <div className="text-gray-400">Best Streak</div>
                <p className="text-sm text-gray-500 mt-2">
                  Your longest streak ever
                </p>
              </div>
            </div>

            {/* Badges */}
            <div className="card">
              <h2 className="text-2xl font-bold mb-6">Badge Collection</h2>
              {badges.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-6xl mb-4">🎯</div>
                  <p>No badges earned yet</p>
                  <p className="text-sm mt-2">
                    Compete in ranked matches to earn seasonal badges!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {badges.map((badge) => (
                    <div key={badge.id} className="glass-hover p-6 text-center">
                      <div className="text-5xl mb-3">
                        {getBadgeIcon(badge.rank_tier)}
                      </div>
                      <div
                        className={`inline-block px-4 py-2 rounded-full bg-gradient-to-r ${getBadgeColor(
                          badge.rank_tier,
                          badge.leaderboard_type,
                        )} text-white font-bold mb-3`}
                      >
                        {badge.rank_tier.replace("_", " ").toUpperCase()}
                      </div>
                      <div className="text-sm text-gray-400">
                        Season {badge.seasons?.season_number}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(
                          badge.seasons?.start_date,
                        ).toLocaleDateString()}{" "}
                        -{" "}
                        {new Date(badge.seasons?.end_date).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rewards Status */}
            <div className="card mt-6">
              <h2 className="text-2xl font-bold mb-4">Reward Eligibility</h2>
              <div className="glass p-6 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">Current Season</h3>
                    <p className="text-sm text-gray-400">
                      Top performers earn exclusive rewards
                    </p>
                  </div>
                  <div className="text-4xl">🎁</div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">1st Place</span>
                    <span className="font-semibold text-yellow-400">₹X</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">2nd Place</span>
                    <span className="font-semibold text-gray-300">₹Y</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">3rd Place</span>
                    <span className="font-semibold text-orange-400">₹Z</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-4 text-center">
                  * Rewards are motivational. Payment system coming soon.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Achievements;
