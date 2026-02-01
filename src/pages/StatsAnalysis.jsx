import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

const StatsAnalysis = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("multiplayer");
  const [stats, setStats] = useState({
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    pointsGained: 0,
    pointsLost: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchStats();
    }
  }, [activeTab, user]);

  const fetchStats = async () => {
    if (!user?.id) {
      console.error("No user logged in");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // For multiplayer, include both 'multiplayer' and 'online' modes
      const gameModes = activeTab === "multiplayer" ? ["multiplayer", "online"] : ["ai"];

      console.log("Fetching stats for user:", user.id, "modes:", gameModes);

      const { data: games, error } = await supabase
        .from("games")
        .select("*")
        .in("game_mode", gameModes)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching games:", error);
        throw error;
      }

      console.log("Games fetched:", games);

      const gamesPlayed = games?.length || 0;
      
      // Calculate wins, losses, draws based on game results
      let wins = 0;
      let losses = 0;
      let draws = 0;

      games?.forEach((game) => {
        const isWhite = game.white_player_id === user.id;
        const isBlack = game.black_player_id === user.id;
        
        if (game.result === "draw") {
          draws++;
        } else if (game.result === "white_win") {
          // White won - multiplayer format
          if (isWhite) wins++;
          else if (isBlack) losses++;
        } else if (game.result === "black_win") {
          // Black won - multiplayer format
          if (isBlack) wins++;
          else if (isWhite) losses++;
        } else if (game.result === "win") {
          // "win" means the player who saved the game won (used in AI games)
          // The player is whoever has their ID in the game (white or black)
          wins++;
        } else if (game.result === "loss") {
          // "loss" means the player who saved the game lost (used in AI games)
          losses++;
        }
      });

      setStats({
        gamesPlayed,
        wins,
        losses,
        draws,
        pointsGained: wins * 50, // Simplified
        pointsLost: losses * 25, // Simplified
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const winRate =
    stats.gamesPlayed > 0
      ? ((stats.wins / stats.gamesPlayed) * 100).toFixed(1)
      : 0;

  const pieData = [
    { name: "Wins", value: stats.wins, color: "#10b981" },
    { name: "Losses", value: stats.losses, color: "#ef4444" },
    { name: "Draws", value: stats.draws, color: "#f59e0b" },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-gradient from-primary-400 to-accent-400">
          Stats & Analysis
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
            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="card text-center">
                <div className="text-3xl font-bold text-primary-400">
                  {stats.gamesPlayed}
                </div>
                <div className="text-sm text-gray-400 mt-1">Games Played</div>
              </div>
              <div className="card text-center">
                <div className="text-3xl font-bold text-green-400">
                  {stats.wins}
                </div>
                <div className="text-sm text-gray-400 mt-1">Wins</div>
              </div>
              <div className="card text-center">
                <div className="text-3xl font-bold text-red-400">
                  {stats.losses}
                </div>
                <div className="text-sm text-gray-400 mt-1">Losses</div>
              </div>
              <div className="card text-center">
                <div className="text-3xl font-bold text-yellow-400">
                  {winRate}%
                </div>
                <div className="text-sm text-gray-400 mt-1">Win Rate</div>
              </div>
            </div>

            {/* Charts and Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Win/Loss Pie Chart */}
              <div className="card">
                <h3 className="text-xl font-bold mb-4">
                  Performance Breakdown
                </h3>
                {stats.gamesPlayed > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    No games played yet
                  </div>
                )}
              </div>

              {/* Points Summary */}
              <div className="card">
                <h3 className="text-xl font-bold mb-4">Points Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 glass rounded-lg">
                    <span className="text-gray-400">Points Gained</span>
                    <span className="text-2xl font-bold text-green-400">
                      +{stats.pointsGained}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 glass rounded-lg">
                    <span className="text-gray-400">Points Lost</span>
                    <span className="text-2xl font-bold text-red-400">
                      -{stats.pointsLost}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-primary-500/20 rounded-lg">
                    <span className="font-semibold">Net Points</span>
                    <span className="text-2xl font-bold text-primary-400">
                      {stats.pointsGained - stats.pointsLost}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Indicators */}
            <div className="card mt-6">
              <h3 className="text-xl font-bold mb-4">Performance Indicators</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Win Rate</span>
                    <span>{winRate}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${winRate}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Activity Level</span>
                    <span>
                      {Math.min(100, (stats.gamesPlayed / 10) * 100).toFixed(0)}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="bg-primary-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (stats.gamesPlayed / 10) * 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StatsAnalysis;
