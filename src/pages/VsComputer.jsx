import { useState } from "react";
import { Chess } from "chess.js";
import ChessBoard from "../components/ChessBoard";
import { getAIMove, calculateAIPoints } from "../utils/aiEngine";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";

const VsComputer = () => {
  const { user } = useAuth();
  const [gameStarted, setGameStarted] = useState(false);
  const [difficulty, setDifficulty] = useState("intermediate");
  const [playerColor, setPlayerColor] = useState("white");
  const [fen, setFen] = useState(new Chess().fen());
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [gameSaved, setGameSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const difficulties = [
    {
      value: "beginner",
      label: "Beginner",
      points: 10,
      description: "Perfect for learning",
    },
    {
      value: "amateur",
      label: "Amateur",
      points: 25,
      description: "Casual play",
    },
    {
      value: "intermediate",
      label: "Intermediate",
      points: 50,
      description: "Moderate challenge",
    },
    {
      value: "expert",
      label: "Expert",
      points: 100,
      description: "Serious competition",
    },
    {
      value: "master",
      label: "Master",
      points: 200,
      description: "Ultimate challenge",
    },
  ];

  const startGame = () => {
    const game = new Chess();
    setFen(game.fen());
    setGameStarted(true);
    setGameResult(null);
    setPointsEarned(0);
    setGameSaved(false);
    setSaveError(null);

    // If player chose black, AI makes first move
    if (playerColor === "black") {
      setTimeout(() => makeAIMove(game.fen()), 500);
    }
  };

  const makeAIMove = async (currentFen) => {
    setIsAIThinking(true);

    // Simulate thinking time
    await new Promise((resolve) => setTimeout(resolve, 500));

    const aiMove = getAIMove(currentFen, difficulty);

    if (aiMove) {
      const game = new Chess(currentFen);
      game.move(aiMove);
      setFen(game.fen());

      if (game.isGameOver()) {
        // AI just moved, so if it's checkmate, determine winner
        let winner = null;
        if (game.isCheckmate()) {
          // The side to move is the one who got checkmated
          winner = game.turn() === 'w' ? 'black' : 'white';
        }
        handleGameOver(game, winner, game.isDraw());
      }
    }

    setIsAIThinking(false);
  };

  const handleMove = (move, newFen, isGameOver, isCheckmate, isDraw) => {
    setFen(newFen);

    if (isGameOver) {
      const game = new Chess(newFen);
      // Determine who won: if it's checkmate, the side to move lost
      // game.turn() returns the side that should move next (the one who got checkmated)
      let winner = null;
      if (isCheckmate) {
        winner = game.turn() === 'w' ? 'black' : 'white';
      }
      handleGameOver(game, winner, isDraw);
    } else {
      // AI's turn
      setTimeout(() => makeAIMove(newFen), 300);
    }
  };

  const handleGameOver = async (game, winner, isDraw) => {
    let result = "draw";
    let points = 0;

    if (winner) {
      // Player wins if they are the winning color
      const playerWon = winner === playerColor;
      result = playerWon ? "win" : "loss";
      points = playerWon ? calculateAIPoints(difficulty, true) : 0;
    }

    setGameResult(result);
    setPointsEarned(points);
    setGameSaved(false);
    setSaveError(null);

    // Only save if user is logged in
    if (!user?.id) {
      console.error("User not logged in, cannot save game");
      setSaveError("Not logged in");
      return;
    }

    // Save game to database
    try {
      // Save game with user_id (simpler structure that works with your DB)
      const gameData = {
        user_id: user.id,
        game_mode: "ai",
        difficulty: difficulty,
        result: result,
        moves: game.history().join(" "),
      };

      console.log("Saving game:", gameData);

      const { data: insertedGame, error: insertError } = await supabase
        .from("games")
        .insert(gameData)
        .select();

      if (insertError) {
        console.error("Error inserting game:", insertError);
        setSaveError(insertError.message);
        return;
      }

      console.log("Game saved successfully:", insertedGame);
      setGameSaved(true);

      // Update leaderboard points (simple structure without seasons)
      if (points > 0) {
        // Get username from user metadata or email
        const username = user.user_metadata?.username || user.email?.split('@')[0] || 'Player';
        
        // Check if user already has a leaderboard entry
        const { data: existingEntry } = await supabase
          .from("leaderboards")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (existingEntry) {
          // Update existing entry
          const { error: updateError } = await supabase
            .from("leaderboards")
            .update({
              ai_points: existingEntry.ai_points + points,
              ai_games_played: existingEntry.ai_games_played + 1,
              username: username,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id);

          if (updateError) {
            console.error("Error updating leaderboard:", updateError);
          } else {
            console.log("Leaderboard updated successfully");
          }
        } else {
          // Create new entry
          const { error: insertLeaderboardError } = await supabase
            .from("leaderboards")
            .insert({
              user_id: user.id,
              username: username,
              ai_points: points,
              ai_games_played: 1,
              multiplayer_points: 0,
              multiplayer_games_played: 0,
            });

          if (insertLeaderboardError) {
            console.error("Error creating leaderboard entry:", insertLeaderboardError);
          } else {
            console.log("Leaderboard entry created successfully");
          }
        }
      }
    } catch (error) {
      console.error("Error saving game:", error);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-gradient from-ai-400 to-ai-600">
          Versus Computer
        </h1>

        {!gameStarted ? (
          <div className="max-w-2xl mx-auto">
            <div className="card mb-6">
              <h2 className="text-2xl font-bold mb-6">Game Settings</h2>

              {/* Difficulty Selection */}
              <div className="mb-6">
                <label className="block text-lg font-semibold mb-4">
                  Select Difficulty
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {difficulties.map((diff) => (
                    <button
                      key={diff.value}
                      onClick={() => setDifficulty(diff.value)}
                      className={`glass-hover p-4 text-left ${
                        difficulty === diff.value ? "ring-2 ring-ai-500" : ""
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-lg">{diff.label}</span>
                        <span className="text-ai-400 text-sm font-semibold">
                          +{diff.points} pts
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">
                        {diff.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selection */}
              <div className="mb-6">
                <label className="block text-lg font-semibold mb-4">
                  Choose Your Color
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setPlayerColor("white")}
                    className={`flex-1 glass-hover p-4 ${
                      playerColor === "white" ? "ring-2 ring-ai-500" : ""
                    }`}
                  >
                    <div className="text-3xl mb-2">♔</div>
                    <span className="font-semibold">White</span>
                  </button>
                  <button
                    onClick={() => setPlayerColor("black")}
                    className={`flex-1 glass-hover p-4 ${
                      playerColor === "black" ? "ring-2 ring-ai-500" : ""
                    }`}
                  >
                    <div className="text-3xl mb-2">♚</div>
                    <span className="font-semibold">Black</span>
                  </button>
                </div>
              </div>

              <button onClick={startGame} className="btn-ai w-full">
                Start Game
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Game Info */}
            <div className="card mb-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-gray-400">Difficulty:</span>
                  <span className="ml-2 font-bold text-ai-400">
                    {difficulties.find((d) => d.value === difficulty)?.label}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Playing as:</span>
                  <span className="ml-2 font-bold">
                    {playerColor === "white" ? "♔ White" : "♚ Black"}
                  </span>
                </div>
                {isAIThinking && (
                  <div className="flex items-center space-x-2 text-ai-400">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-ai-400"></div>
                    <span>AI is thinking...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Chess Board */}
            <ChessBoard
              fen={fen}
              onMove={handleMove}
              playerColor={playerColor}
              disabled={isAIThinking}
            />

            {/* Game Result */}
            {gameResult && (
              <div className="card mt-6 text-center">
                <h2 className="text-3xl font-bold mb-4">
                  {gameResult === "win" && (
                    <span className="text-green-400">Victory! 🎉</span>
                  )}
                  {gameResult === "loss" && (
                    <span className="text-red-400">Defeat</span>
                  )}
                  {gameResult === "draw" && (
                    <span className="text-yellow-400">Draw (Stalemate)</span>
                  )}
                </h2>
                {pointsEarned > 0 && (
                  <p className="text-xl text-ai-400 mb-4">
                    +{pointsEarned} AI Leaderboard Points
                  </p>
                )}
                {/* Save status indicator */}
                {gameSaved && (
                  <p className="text-sm text-green-400 mb-2">
                    ✓ Game saved to your stats
                  </p>
                )}
                {saveError && (
                  <p className="text-sm text-red-400 mb-2">
                    ✗ Failed to save: {saveError}
                  </p>
                )}
                <button onClick={startGame} className="btn-ai">
                  Play Again
                </button>
              </div>
            )}

            <button
              onClick={() => setGameStarted(false)}
              className="btn-secondary mt-6"
            >
              ← Back to Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VsComputer;
