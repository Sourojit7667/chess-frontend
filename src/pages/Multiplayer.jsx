import { useState, useEffect, useRef, useCallback } from "react";
import { Chess } from "chess.js";
import ChessBoard from "../components/ChessBoard";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";

const WS_URL = "ws://localhost:8080/api/ws";
const MULTIPLAYER_WIN_POINTS = 100;
const MULTIPLAYER_DRAW_POINTS = 25;

const Multiplayer = () => {
  const { user } = useAuth();
  const [searching, setSearching] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [fen, setFen] = useState(new Chess().fen());
  const [opponent, setOpponent] = useState(null);
  const [playerColor, setPlayerColor] = useState("white");
  const [gameResult, setGameResult] = useState(null);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [gameCode, setGameCode] = useState("");
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);

  const wsRef = useRef(null);
  const gameRef = useRef(new Chess());

  const getUsername = () => {
    return user?.user_metadata?.username || user?.email?.split('@')[0] || 'Player';
  };

  // WebSocket message handler
  const handleWSMessage = useCallback((event) => {
    const message = JSON.parse(event.data);
    console.log("WS Message received:", message);

    switch (message.type) {
      case "game_created":
        setPlayerColor(message.payload.playerColor);
        setStatusMessage(message.payload.message);
        setGameCode(message.payload.gameCode);
        break;

      case "game_joined":
        setPlayerColor(message.payload.playerColor);
        setFen(message.payload.fen);
        gameRef.current = new Chess(message.payload.fen);
        setOpponentConnected(true);
        setOpponent({ username: message.payload.opponentName || "Opponent" });
        setStatusMessage("Game started!");
        setSearching(false);
        setGameStarted(true);
        break;

      case "opponent_joined":
        setOpponentConnected(true);
        setOpponent({ username: message.payload.opponentName || "Opponent" });
        setStatusMessage("Opponent joined! Game started.");
        setSearching(false);
        setGameStarted(true);
        break;

      case "matched":
        // Matchmaking found an opponent
        setOpponent({ username: message.payload.opponentName || "Opponent" });
        setPlayerColor(message.payload.playerColor);
        setGameCode(message.payload.gameCode);
        setOpponentConnected(true);
        setSearching(false);
        setGameStarted(true);
        setStatusMessage("Match found!");
        break;

      case "opponent_move":
        const newFen = message.payload.fen;
        console.log("Opponent move received:", message.payload.move, newFen);
        
        gameRef.current = new Chess(newFen);
        setFen(newFen);
        
        if (gameRef.current.isGameOver()) {
          if (gameRef.current.isCheckmate()) {
            const winnerColor = gameRef.current.turn() === 'w' ? 'black' : 'white';
            const playerWon = winnerColor === playerColor;
            const result = playerWon ? "win" : "loss";
            const points = playerWon ? MULTIPLAYER_WIN_POINTS : 0;
            setGameResult(result);
            setPointsEarned(points);
            saveGameResult(result, points);
          } else {
            setGameResult("draw");
            setPointsEarned(MULTIPLAYER_DRAW_POINTS);
            saveGameResult("draw", MULTIPLAYER_DRAW_POINTS);
          }
        }
        break;

      case "game_ended":
        setGameResult(message.payload.result);
        break;

      case "opponent_forfeited":
        setGameResult("win");
        setPointsEarned(MULTIPLAYER_WIN_POINTS);
        setStatusMessage("Opponent forfeited. You win!");
        saveGameResult("win", MULTIPLAYER_WIN_POINTS);
        break;

      case "opponent_disconnected":
        setOpponentConnected(false);
        setStatusMessage(message.payload.message);
        break;

      case "error":
        alert(message.payload.message);
        setSearching(false);
        break;
    }
  }, [playerColor]);

  // Connect to WebSocket
  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
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

  const findMatch = () => {
    setSearching(true);
    setStatusMessage("Searching for opponent...");
    
    // Connect to WebSocket and join matchmaking queue
    connectWS();
    
    setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "find_match",
          payload: { 
            username: getUsername(),
            userId: user?.id
          }
        }));
      }
    }, 500);
  };

  const cancelSearch = () => {
    setSearching(false);
    setStatusMessage("");
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "cancel_matchmaking",
        payload: {}
      }));
      wsRef.current.close();
    }
  };

  const saveGameResult = async (result, points) => {
    if (!user?.id) {
      console.log("User not logged in, cannot save game");
      return;
    }

    try {
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
        const username = getUsername();
        
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

  const handleMove = (move, newFen, isGameOver, isCheckmate, isDraw) => {
    setFen(newFen);
    gameRef.current = new Chess(newFen);

    // Send move to opponent via WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "move",
        payload: {
          gameCode: gameCode,
          move: move,
          fen: newFen
        }
      }));
    }

    if (isGameOver) {
      let result = "draw";
      let points = MULTIPLAYER_DRAW_POINTS;

      if (isCheckmate) {
        const winnerColor = gameRef.current.turn() === 'w' ? 'black' : 'white';
        const playerWon = winnerColor === playerColor;
        result = playerWon ? "win" : "loss";
        points = playerWon ? MULTIPLAYER_WIN_POINTS : 0;
      }

      setGameResult(result);
      setPointsEarned(points);
      saveGameResult(result, points);

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "game_over",
          payload: {
            gameCode: gameCode,
            winner: isCheckmate ? (gameRef.current.turn() === 'w' ? 'black' : 'white') : "none",
            result: result
          }
        }));
      }
    }
  };

  const handleForfeit = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const opponentColor = playerColor === "white" ? "Black" : "White";
      
      wsRef.current.send(JSON.stringify({
        type: "forfeit",
        payload: {
          gameCode: gameCode,
          forfeitingColor: playerColor,
          winnerColor: opponentColor
        }
      }));

      setGameResult("loss");
      setPointsEarned(0);
      setShowForfeitConfirm(false);
      setStatusMessage(`You forfeited. ${opponentColor} wins!`);
      
      saveGameResult("loss", 0);
    }
  };

  const leaveGame = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "leave_game",
        payload: { gameCode: gameCode }
      }));
      wsRef.current.close();
    }
    setGameStarted(false);
    setOpponent(null);
    setGameResult(null);
    setOpponentConnected(false);
    setStatusMessage("");
    setGameCode("");
    setPointsEarned(0);
    setShowForfeitConfirm(false);
    gameRef.current = new Chess();
    setFen(new Chess().fen());
  };

  const playAgain = () => {
    leaveGame();
    // Small delay then find new match
    setTimeout(() => {
      findMatch();
    }, 500);
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-gradient from-multiplayer-400 to-multiplayer-600">
          Multiplayer Matchmaking
        </h1>

        {!gameStarted && !searching && (
          <div className="max-w-2xl mx-auto">
            <div className="card text-center">
              <div className="text-6xl mb-6">🌍</div>
              <h2 className="text-3xl font-bold mb-4">Ready to Compete?</h2>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                Find a random opponent and compete for multiplayer leaderboard
                points!
              </p>
              <button
                onClick={findMatch}
                className="btn-multiplayer text-lg px-8"
              >
                Find Match
              </button>
            </div>

            <div className="card mt-6">
              <h3 className="text-xl font-bold mb-4">How It Works</h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start space-x-3">
                  <span className="text-multiplayer-400 font-bold">1.</span>
                  <span>Click "Find Match" to enter the matchmaking queue</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-multiplayer-400 font-bold">2.</span>
                  <span>Get matched with a random opponent</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-multiplayer-400 font-bold">3.</span>
                  <span>Play and earn multiplayer leaderboard points</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-multiplayer-400 font-bold">4.</span>
                  <span>Climb the rankings and earn seasonal badges!</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {searching && (
          <div className="max-w-2xl mx-auto">
            <div className="card text-center">
              <div className="animate-pulse text-6xl mb-6">🔍</div>
              <h2 className="text-3xl font-bold mb-4">Finding Opponent...</h2>
              <div className="flex justify-center mb-8">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-multiplayer-500"></div>
              </div>
              <p className="text-gray-400 mb-8">
                Searching for a worthy opponent. This may take a moment.
              </p>
              <button onClick={cancelSearch} className="btn-secondary">
                Cancel Search
              </button>
            </div>
          </div>
        )}

        {gameStarted && (
          <div>
            {/* Game Info */}
            <div className="card mb-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div>
                    <div className="text-sm text-gray-400">You</div>
                    <div className="font-bold text-green-400">
                      {getUsername()}
                    </div>
                  </div>
                  <div className="text-2xl">⚔️</div>
                  <div>
                    <div className="text-sm text-gray-400">Opponent</div>
                    <div className="font-bold text-red-400">{opponent?.username || "Waiting..."}</div>
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Playing as:</span>
                  <span className={`ml-2 font-bold ${playerColor === "white" ? "text-white" : "text-gray-300"}`}>
                    {playerColor === "white" ? "⚪ White" : "⚫ Black"}
                  </span>
                </div>
              </div>
              
              {/* Status message */}
              {statusMessage && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${opponentConnected ? "bg-green-500" : "bg-yellow-500 animate-pulse"}`}></div>
                    <span className="text-gray-400">{statusMessage}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chess Board */}
            <ChessBoard
              fen={fen}
              onMove={handleMove}
              playerColor={playerColor}
              disabled={!opponentConnected || gameResult !== null}
            />

            {/* Forfeit Button */}
            {opponentConnected && !gameResult && (
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
                <h2 className="text-3xl font-bold mb-4">
                  {gameResult === "win" && (
                    <span className="text-green-400">Victory! 🎉</span>
                  )}
                  {gameResult === "loss" && (
                    <span className="text-red-400">Defeat</span>
                  )}
                  {gameResult === "draw" && (
                    <span className="text-yellow-400">Draw</span>
                  )}
                </h2>
                {pointsEarned > 0 && (
                  <p className="text-xl text-multiplayer-400 mb-4">
                    +{pointsEarned} Multiplayer Points! 🎉
                  </p>
                )}
                <button onClick={playAgain} className="btn-multiplayer">
                  Find New Match
                </button>
              </div>
            )}

            <button
              onClick={leaveGame}
              className="btn-secondary mt-6"
            >
              ← Leave Game
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Multiplayer;
