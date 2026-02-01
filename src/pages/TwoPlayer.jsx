import { useState, useEffect, useRef, useCallback } from "react";
import { Chess } from "chess.js";
import ChessBoard from "../components/ChessBoard";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";

const WS_URL = "ws://localhost:8080/api/ws";
const MULTIPLAYER_WIN_POINTS = 100;

const TwoPlayer = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState(null); // 'local' or 'online'
  const [gameStarted, setGameStarted] = useState(false);
  const [fen, setFen] = useState(new Chess().fen());
  const [gameCode, setGameCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [gameResult, setGameResult] = useState(null);
  const [playerColor, setPlayerColor] = useState("white");
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [opponentName, setOpponentName] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [statusMessage, setStatusMessage] = useState("");
  const [pointsEarned, setPointsEarned] = useState(0);
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);
  
  const wsRef = useRef(null);

  const getUsername = () => {
    return user?.user_metadata?.username || user?.email?.split('@')[0] || 'Player';
  };
  const gameRef = useRef(new Chess());

  // WebSocket message handler
  const handleWSMessage = useCallback((event) => {
    const message = JSON.parse(event.data);
    console.log("WS Message received:", message);

    switch (message.type) {
      case "game_created":
        setPlayerColor(message.payload.playerColor);
        setStatusMessage(message.payload.message);
        break;

      case "game_joined":
        setPlayerColor(message.payload.playerColor);
        setFen(message.payload.fen);
        gameRef.current = new Chess(message.payload.fen);
        setOpponentConnected(true);
        setOpponentName(message.payload.opponentName || "Opponent");
        setStatusMessage(message.payload.message);
        break;

      case "opponent_joined":
        setOpponentConnected(true);
        setOpponentName(message.payload.opponentName || "Opponent");
        setStatusMessage(message.payload.message);
        break;

      case "opponent_move":
        const move = message.payload.move;
        const newFen = message.payload.fen;
        console.log("Opponent move received:", move, newFen);
        
        // Update the game state with opponent's move
        gameRef.current = new Chess(newFen);
        setFen(newFen);
        
        // Check for game over
        if (gameRef.current.isGameOver()) {
          if (gameRef.current.isCheckmate()) {
            const winner = gameRef.current.turn() === 'w' ? 'Black' : 'White';
            setGameResult(`${winner} wins by checkmate!`);
          } else {
            setGameResult("Game ended in a draw!");
          }
        }
        break;

      case "game_ended":
        setGameResult(message.payload.result);
        if (message.payload.points !== undefined) {
          setPointsEarned(message.payload.points);
        }
        break;

      case "opponent_forfeited":
        setGameResult("You win! Opponent forfeited.");
        setPointsEarned(MULTIPLAYER_WIN_POINTS);
        // Save the win
        saveGameResult("win", MULTIPLAYER_WIN_POINTS);
        break;

      case "opponent_disconnected":
        setOpponentConnected(false);
        setStatusMessage(message.payload.message);
        break;

      case "error":
        alert(message.payload.message);
        break;
    }
  }, []);

  // Connect to WebSocket
  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      console.log("WebSocket connected");
      setConnectionStatus("connected");
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setConnectionStatus("disconnected");
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setConnectionStatus("error");
    };

    ws.onmessage = handleWSMessage;
    wsRef.current = ws;
  }, [handleWSMessage]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const startLocalGame = () => {
    setMode("local");
    setGameStarted(true);
    setFen(new Chess().fen());
    gameRef.current = new Chess();
    setGameResult(null);
  };

  const createOnlineGame = () => {
    // Generate random 6-character code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setGameCode(code);
    setMode("online");
    setGameStarted(true);
    setFen(new Chess().fen());
    gameRef.current = new Chess();
    setGameResult(null);
    setPlayerColor("white");
    setOpponentConnected(false);
    setOpponentName("");
    setStatusMessage("Waiting for opponent to join...");

    // Connect to WebSocket and create game
    connectWS();
    setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "create_game",
          payload: { gameCode: code, username: getUsername() }
        }));
      }
    }, 500);
  };

  const joinOnlineGame = () => {
    if (!joinCode) return;
    setGameCode(joinCode);
    setMode("online");
    setGameStarted(true);
    setGameResult(null);
    setPlayerColor("black");
    setOpponentName("");
    setStatusMessage("Joining game...");

    // Connect to WebSocket and join game
    connectWS();
    setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "join_game",
          payload: { gameCode: joinCode, username: getUsername() }
        }));
      }
    }, 500);
  };

  const handleMove = (move, newFen, isGameOver, isCheckmate, isDraw) => {
    setFen(newFen);
    gameRef.current = new Chess(newFen);

    // Send move to opponent if online
    if (mode === "online" && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "move",
        payload: {
          gameCode: gameCode,
          move: move,
          fen: newFen
        }
      }));
    }

    // Handle game over
    if (isGameOver) {
      if (isCheckmate) {
        const winnerColor = gameRef.current.turn() === 'w' ? 'Black' : 'White';
        const playerWon = (winnerColor === 'White' && playerColor === 'white') || 
                         (winnerColor === 'Black' && playerColor === 'black');
        
        setGameResult(`${winnerColor} wins by checkmate!`);
        
        if (mode === "online") {
          const result = playerWon ? "win" : "loss";
          const points = playerWon ? MULTIPLAYER_WIN_POINTS : 0;
          setPointsEarned(points);
          saveGameResult(result, points);
          
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: "game_over",
              payload: {
                gameCode: gameCode,
                winner: winnerColor,
                result: `${winnerColor} wins by checkmate!`
              }
            }));
          }
        }
      } else if (isDraw) {
        setGameResult("Game ended in a draw!");
        
        if (mode === "online") {
          const DRAW_POINTS = 25;
          setPointsEarned(DRAW_POINTS);
          saveGameResult("draw", DRAW_POINTS);
          
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: "game_over",
              payload: {
                gameCode: gameCode,
                winner: "none",
                result: "Game ended in a draw!"
              }
            }));
          }
        }
      }
    }
  };

  const resetGame = () => {
    setFen(new Chess().fen());
    gameRef.current = new Chess();
    setGameResult(null);
  };

  const leaveGame = () => {
    if (mode === "online" && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "leave_game",
        payload: { gameCode: gameCode }
      }));
      wsRef.current.close();
    }
    setGameStarted(false);
    setGameCode("");
    setJoinCode("");
    setGameResult(null);
    setOpponentConnected(false);
    setStatusMessage("");
    setPlayerColor("white");
    setPointsEarned(0);
    setShowForfeitConfirm(false);
  };

  // Save game result to database and update leaderboard
  const saveGameResult = async (result, points) => {
    if (!user?.id) {
      console.log("User not logged in, cannot save game");
      return;
    }

    try {
      // Save game to database
      const gameData = {
        user_id: user.id,
        game_mode: "multiplayer",
        result: result,
        moves: gameRef.current.history().join(" "),
      };

      console.log("Saving multiplayer game:", gameData);

      const { error: insertError } = await supabase
        .from("games")
        .insert(gameData);

      if (insertError) {
        console.error("Error inserting game:", insertError);
      } else {
        console.log("Multiplayer game saved successfully");
      }

      // Update leaderboard
      if (points > 0) {
        const username = user.user_metadata?.username || user.email?.split('@')[0] || 'Player';
        
        const { data: existingEntry } = await supabase
          .from("leaderboards")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (existingEntry) {
          const { error: updateError } = await supabase
            .from("leaderboards")
            .update({
              multiplayer_points: existingEntry.multiplayer_points + points,
              multiplayer_games_played: existingEntry.multiplayer_games_played + 1,
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
          const { error: insertLeaderboardError } = await supabase
            .from("leaderboards")
            .insert({
              user_id: user.id,
              username: username,
              ai_points: 0,
              ai_games_played: 0,
              multiplayer_points: points,
              multiplayer_games_played: 1,
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

  // Handle forfeit
  const handleForfeit = () => {
    if (mode === "online" && wsRef.current?.readyState === WebSocket.OPEN) {
      const opponentColor = playerColor === "white" ? "Black" : "White";
      
      wsRef.current.send(JSON.stringify({
        type: "forfeit",
        payload: {
          gameCode: gameCode,
          forfeitingColor: playerColor,
          winnerColor: opponentColor
        }
      }));

      setGameResult(`You forfeited. ${opponentColor} wins!`);
      setPointsEarned(0);
      setShowForfeitConfirm(false);
      
      // Save the loss
      saveGameResult("loss", 0);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-gradient from-purple-400 to-purple-600">
          Two Player
        </h1>

        {!gameStarted ? (
          <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pass & Play */}
              <div className="card-hover" onClick={startLocalGame}>
                <div className="bg-purple-500/20 w-16 h-16 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-4xl">🎮</span>
                </div>
                <h3 className="text-2xl font-bold mb-2">Pass & Play</h3>
                <p className="text-gray-400 mb-4">
                  Play on the same device. Perfect for face-to-face games.
                </p>
                <div className="text-purple-400 font-semibold">
                  Start Local Game →
                </div>
              </div>

              {/* Play with Friend */}
              <div className="card">
                <div className="bg-purple-500/20 w-16 h-16 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-4xl">🌐</span>
                </div>
                <h3 className="text-2xl font-bold mb-4">Play with Friend</h3>
                <p className="text-gray-400 mb-4">
                  Share a code and play online with a friend.
                </p>

                <div className="space-y-3">
                  <button
                    onClick={createOnlineGame}
                    className="btn-primary w-full"
                  >
                    Create Game
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-slate-900 text-gray-400">
                        or
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full">
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) =>
                        setJoinCode(e.target.value.toUpperCase())
                      }
                      placeholder="Enter code"
                      className="input flex-1 min-w-0"
                      maxLength={6}
                    />
                    <button
                      onClick={joinOnlineGame}
                      disabled={!joinCode}
                      className="btn-primary disabled:opacity-50 whitespace-nowrap flex-shrink-0"
                    >
                      Join
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Game Info */}
            <div className="card mb-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {mode === "online" ? (
                  <div className="flex items-center space-x-4">
                    <div>
                      <div className="text-sm text-gray-400">You</div>
                      <div className="font-bold text-green-400">{getUsername()}</div>
                    </div>
                    <div className="text-2xl">⚔️</div>
                    <div>
                      <div className="text-sm text-gray-400">Opponent</div>
                      <div className="font-bold text-red-400">{opponentName || "Waiting..."}</div>
                    </div>
                    <div className="ml-4">
                      <span className="text-gray-400">Playing as:</span>
                      <span className={`ml-2 font-bold ${playerColor === "white" ? "text-white" : "text-gray-300"}`}>
                        {playerColor === "white" ? "⚪ White" : "⚫ Black"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-gray-400">Mode:</span>
                      <span className="ml-2 font-bold text-purple-400">Pass & Play</span>
                    </div>
                  </div>
                )}
                {gameCode && (
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-400">Game Code:</span>
                    <div className="bg-purple-500/20 px-4 py-2 rounded-lg">
                      <span className="text-2xl font-bold text-purple-400 tracking-wider">
                        {gameCode}
                      </span>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(gameCode)}
                      className="btn-secondary text-sm py-2"
                    >
                      Copy
                    </button>
                  </div>
                )}
              </div>
              
              {/* Connection Status for Online Mode */}
              {mode === "online" && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${opponentConnected ? "bg-green-500" : "bg-yellow-500 animate-pulse"}`}></div>
                    <span className="text-gray-400">
                      {statusMessage || (opponentConnected ? "Opponent connected" : "Waiting for opponent...")}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Chess Board */}
            <ChessBoard 
              fen={fen} 
              onMove={handleMove} 
              playerColor={mode === "online" ? playerColor : "white"} 
              allowBothSides={mode === "local"}
              disabled={(mode === "online" && !opponentConnected) || gameResult !== null}
            />

            {/* Forfeit Button for Online Mode */}
            {mode === "online" && opponentConnected && !gameResult && (
              <div className="mt-4">
                {!showForfeitConfirm ? (
                  <button
                    onClick={() => setShowForfeitConfirm(true)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    🏳️ Forfeit Game
                  </button>
                ) : (
                  <div className="card bg-red-900/30 border border-red-500/50 p-4">
                    <p className="text-white mb-3">Are you sure you want to forfeit? Your opponent will win and receive {MULTIPLAYER_WIN_POINTS} points.</p>
                    <div className="flex gap-3">
                      <button
                        onClick={handleForfeit}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Yes, Forfeit
                      </button>
                      <button
                        onClick={() => setShowForfeitConfirm(false)}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Game Result */}
            {gameResult && (
              <div className="card mt-6 text-center">
                <h2 className="text-2xl font-bold mb-4 text-purple-400">
                  {gameResult}
                </h2>
                {mode === "online" && pointsEarned > 0 && (
                  <p className="text-green-400 mb-4 text-lg">
                    +{pointsEarned} Multiplayer Points! 🎉
                  </p>
                )}
                {mode === "local" && (
                  <p className="text-gray-400 mb-4 text-sm">
                    (Pass & Play games are not saved to stats)
                  </p>
                )}
                {mode === "local" && (
                  <button onClick={resetGame} className="btn-primary">
                    Play Again
                  </button>
                )}
              </div>
            )}

            <button
              onClick={leaveGame}
              className="btn-secondary mt-6"
            >
              ← Back to Mode Selection
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TwoPlayer;
