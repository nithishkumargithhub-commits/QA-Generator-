import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Sparkles, CheckCircle } from 'lucide-react';

interface VoiceVivaPlayerProps {
  questionStem: string;
  onAnswerRecorded: (transcript: string) => void;
}

export const VoiceVivaPlayer: React.FC<VoiceVivaPlayerProps> = ({ questionStem, onAnswerRecorded }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setSpeechSupported(true);
    }
  }, []);

  const speakQuestion = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(questionStem);
    utterance.rate = 0.95;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    if (!speechSupported) {
      alert("Speech recognition is not supported in your current browser.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const resultTranscript = event.results[current][0].transcript;
      setTranscript(resultTranscript);
      onAnswerRecorded(resultTranscript);
    };

    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
          <Mic className="w-4 h-4 text-emerald-400" /> Voice Viva / Oral Answer Mode
        </div>
        <button
          onClick={speakQuestion}
          className="bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
        >
          {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-amber-400" /> : <Volume2 className="w-3.5 h-3.5" />}
          <span>{isSpeaking ? 'Speaking...' : 'Read Question Aloud'}</span>
        </button>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Oral Response Recording:</span>
          {isListening && <span className="text-emerald-400 font-bold flex items-center gap-1 animate-pulse"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Listening...</span>}
        </div>
        <div className="min-h-[60px] text-sm text-slate-200 font-sans italic">
          {transcript || 'Click the microphone button below and speak your answer clearly...'}
        </div>
      </div>

      <button
        onClick={startListening}
        disabled={isListening}
        className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition ${
          isListening
            ? 'bg-emerald-600 text-white animate-pulse'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
        }`}
      >
        <Mic className="w-4 h-4" />
        <span>{isListening ? 'Listening to your voice...' : 'Start Voice Viva Answer'}</span>
      </button>
    </div>
  );
};
