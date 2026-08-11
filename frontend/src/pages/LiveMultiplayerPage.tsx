import React, { useState, useEffect, useRef } from 'react';
import { Gamepad2, Users, Trophy, Play, Send, Zap } from 'lucide-react';
import { api } from '../services/api';

export const LiveMultiplayerPage: React.FC = () => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<string>('');
  const [roomCode, setRoomCode] = useState<string>('');
  const [joinInputCode, setJoinInputCode] = useState<string>('');
  const [username, setUsername] = useState<string>('Player_' + Math.floor(Math.random() * 1000));
  const [isJoined, setIsJoined] = useState(false);
  const [leaderboard, setLeaderboard] = useState<Array<{ username: string; score: number }>>([]);
  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'ended'>('lobby');

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    api.getQuizzes().then(data => {
      setQuizzes(data);
      if (data.length > 0) setSelectedQuiz(data[0].id);
    });
  }, []);

  const handleCreateRoom = async () => {
    if (!selectedQuiz) return;
    try {
      const res = await api.createLiveRoom(selectedQuiz);
      setRoomCode(res.room_code);
      connectWebSocket(res.room_code, 'Host');
    } catch (err: any) {
      alert(`Error creating room: ${err.message}`);
    }
  };

  const handleJoinRoom = () => {
    if (!joinInputCode.trim()) return;
    setRoomCode(joinInputCode.toUpperCase());
    connectWebSocket(joinInputCode.toUpperCase(), username);
  };

  const connectWebSocket = (code: string, user: string) => {
    const wsUrl = `ws://localhost:8000/api/v1/live/ws/${code}?username=${encodeURIComponent(user)}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsJoined(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'LEADERBOARD_UPDATE') {
        setLeaderboard(data.leaderboard || []);
      } else if (data.type === 'GAME_STARTED') {
        setGameState('playing');
      }
    };

    ws.onclose = () => {
      setIsJoined(false);
    };

    wsRef.current = ws;
  };

  const handleStartGame = () => {
    if (wsRef.current && roomCode) {
      wsRef.current.send(JSON.stringify({ type: 'START_GAME' }));
    }
  };

  const handleSimulateAnswer = () => {
    if (wsRef.current && roomCode) {
      wsRef.current.send(JSON.stringify({ type: 'SUBMIT_ANSWER', points: 150 }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-1">
              <Gamepad2 className="w-5 h-5 text-amber-400" />
              <span>SYNCHRONOUS WEBSOCKET BATTLE ENGINE</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Live Multiplayer Classroom Mode</h1>
            <p className="text-slate-400 text-sm mt-1">Host Kahoot-style live quiz battles with real-time scoreboards.</p>
          </div>
        </div>

        {!isJoined ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Host Game Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 text-indigo-400 font-bold">
                <Play className="w-5 h-5" /> Host a New Game Session
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase">Select Quiz</label>
                <select
                  value={selectedQuiz}
                  onChange={e => setSelectedQuiz(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white mt-1 focus:outline-none"
                >
                  {quizzes.map(q => (
                    <option key={q.id} value={q.id}>{q.title}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleCreateRoom}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-indigo-600/30"
              >
                Create Live Room & Get Code
              </button>
            </div>

            {/* Join Game Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <Zap className="w-5 h-5" /> Join Live Game as Student
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase">Your Player Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white mt-1 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase">6-Digit Room Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={joinInputCode}
                  onChange={e => setJoinInputCode(e.target.value.toUpperCase())}
                  placeholder="e.g. F3A9B1"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-center font-mono text-lg font-bold tracking-widest text-amber-400 uppercase mt-1 focus:outline-none"
                />
              </div>
              <button
                onClick={handleJoinRoom}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-amber-600/30"
              >
                Join Live Arena
              </button>
            </div>
          </div>
        ) : (
          /* Live Arena Screen */
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-8 shadow-2xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-6">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">LOBBY ROOM CODE</span>
                <div className="text-4xl font-black font-mono tracking-widest text-indigo-400 mt-1">{roomCode}</div>
              </div>

              <div className="flex items-center gap-3">
                {gameState === 'lobby' && (
                  <button
                    onClick={handleStartGame}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-3 rounded-xl text-sm transition shadow-lg shadow-emerald-600/30"
                  >
                    Start Live Game!
                  </button>
                )}
                {gameState === 'playing' && (
                  <button
                    onClick={handleSimulateAnswer}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition"
                  >
                    Submit Quick Answer (+150 pts)
                  </button>
                )}
              </div>
            </div>

            {/* Leaderboard Table */}
            <div>
              <div className="flex items-center gap-2 text-lg font-bold text-white mb-4">
                <Trophy className="w-5 h-5 text-amber-400" /> Live Leaderboard & Scores
              </div>
              <div className="space-y-3">
                {leaderboard.length === 0 ? (
                  <div className="text-slate-500 text-sm py-4">Waiting for players to join WebSocket connection...</div>
                ) : (
                  leaderboard.map((player, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border flex items-center justify-between transition ${
                        idx === 0
                          ? 'bg-amber-950/40 border-amber-500/80 text-amber-200'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 font-semibold">
                        <span className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center font-mono font-bold text-xs">
                          #{idx + 1}
                        </span>
                        <span>{player.username}</span>
                      </div>
                      <span className="font-mono font-extrabold text-indigo-400 text-lg">
                        {player.score} pts
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
