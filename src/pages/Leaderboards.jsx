import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";

const Leaderboards = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("ai");
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [activeTab]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      // Determine which points column to sort by
      const pointsColumn = activeTab === "ai" ? "ai_points" : "multiplayer_points";
      const gamesColumn = activeTab === "ai" ? "ai_games_played" : "multiplayer_games_played";

      // Get leaderboard data sorted by points
      const { data, error } = await supabase
        .from("leaderboards")
        .select("*")
        .gt(pointsColumn, 0) // Only show users with points > 0
        .order(pointsColumn, { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error fetching leaderboard:", error);
        throw error;
      }

      console.log("Leaderboard data:", data);
      setLeaderboardData(data || []);

      // Find current user's rank
      if (user && data) {
        const userIndex = data.findIndex(entry => entry.user_id === user.id);
        if (userIndex !== -1) {
          setUserRank(userIndex + 1);
        } else {
          setUserRank(null);
        }
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      setLeaderboardData([]);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank) => {
    if (rank <= 10) return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50";
    if (rank <= 50) return "bg-gray-400/20 text-gray-300 border border-gray-400/50";
    if (rank <= 100) return "bg-orange-500/20 text-orange-400 border border-orange-500/50";
    return "";
  };

  const getRankLabel = (rank) => {
    if (rank <= 10) return "🏆 Top 10";
    if (rank <= 50) return "🥈 Top 50";
    if (rank <= 100) return "🥉 Top 100";
    return "";
  };

  const getPoints = (entry) => {
    return activeTab === "ai" ? entry.ai_points : entry.multiplayer_points;
  };

  const getGamesPlayed = (entry) => {
    return activeTab === "ai" ? entry.ai_games_played : entry.multiplayer_games_played;
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-gradient from-primary-400 to-accent-400">
          Leaderboards
        </h1>

        {/* User's Current Rank */}
        {userRank && (
          <div className="card mb-6 bg-gradient-to-r from-primary-500/20 to-accent-500/20 border border-primary-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Your Current Rank</p>
                <p className="text-3xl font-bold text-primary-400">#{userRank}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm">Your Points</p>
                <p className="text-2xl font-bold">
                  {leaderboardData.find(e => e.user_id === user?.id)?.[activeTab === "ai" ? "ai_points" : "multiplayer_points"] || 0}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex mb-6 glass rounded-lg p-1">
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
        </div>

        {/* Leaderboard Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
            </div>
          ) : leaderboardData.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-6xl mb-4">🏆</div>
              <p className="text-xl font-semibold mb-2">No rankings yet!</p>
              <p>Be the first to compete and claim the top spot!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-white/10">
                  <tr>
                    <th className="text-left p-4 font-semibold">Rank</th>
                    <th className="text-left p-4 font-semibold">Player</th>
                    <th className="text-right p-4 font-semibold">Games</th>
                    <th className="text-right p-4 font-semibold">Points</th>
                    <th className="text-right p-4 font-semibold">Badge</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData.map((entry, index) => {
                    const rank = index + 1;
                    const badgeClass = getRankBadge(rank);
                    const badgeLabel = getRankLabel(rank);
                    const isCurrentUser = user && entry.user_id === user.id;

                    return (
                      <tr
                        key={entry.id}
                        className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                          isCurrentUser ? "bg-primary-500/10" : ""
                        }`}
                      >
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            {rank <= 3 && (
                              <span className="text-2xl">
                                {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
                              </span>
                            )}
                            <span className="font-bold text-lg">{rank}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                              isCurrentUser 
                                ? "bg-gradient-to-br from-primary-500 to-accent-500" 
                                : "bg-gradient-to-br from-gray-600 to-gray-700"
                            }`}>
                              {entry.username?.[0]?.toUpperCase() || "U"}
                            </div>
                            <div>
                              <span className="font-medium">
                                {entry.username || "Unknown Player"}
                              </span>
                              {isCurrentUser && (
                                <span className="ml-2 text-xs bg-primary-500/30 text-primary-300 px-2 py-0.5 rounded">
                                  You
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-right text-gray-400">
                          {getGamesPlayed(entry)}
                        </td>
                        <td className="p-4 text-right">
                          <span
                            className={`font-bold text-lg ${
                              activeTab === "multiplayer"
                                ? "text-multiplayer-400"
                                : "text-ai-400"
                            }`}
                          >
                            {getPoints(entry)}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {badgeLabel && (
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${badgeClass}`}>
                              {badgeLabel}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboards;
