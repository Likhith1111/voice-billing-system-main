import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  Sparkles, Mic, MicOff, Send, X, Volume2, 
  TrendingUp, BookOpen, Package, Users, Loader2 
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../App';
import { apiUrl } from '../config/api';
import { queryStoreAssistantLocally } from '../lib/offlineStore';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AiAssistantModal({ isOpen, onClose }: AiAssistantModalProps) {
  const { shopkeeper } = useAuth();
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any | null>(null);
  const recognitionRef = useRef<any>(null);

  const speakText = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-IN';
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis error:', err);
      }
    }
  };

  const handleStartListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error('Voice recognition is not supported in this browser.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setQuery(text);
        setIsListening(false);
        handleSendQuery(text);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  const handleStopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  };

  const handleSendQuery = async (customText?: string) => {
    const textToSubmit = (customText || query).trim();
    if (!textToSubmit) return;

    setLoading(true);

    // 1. Try backend assistant query first
    try {
      const res = await axios.post(
        apiUrl('/api/assistant-query/'),
        {
          query: textToSubmit,
          shopkeeper_email: shopkeeper?.email,
        },
        { timeout: 2500 }
      );

      if (res.data && res.data.success) {
        setResponse(res.data);
        speakText(res.data.spoken_response);
        setLoading(false);
        return;
      }
    } catch (e) {
      // Backend unavailable, fallback to instant local query
    }

    // 2. Local fallback calculation
    const localRes = queryStoreAssistantLocally(textToSubmit, shopkeeper?.email);
    setResponse({
      query: textToSubmit,
      spoken_response: localRes.spokenResponse,
      category: localRes.category,
      metrics: {
        today_sales: localRes.metrics.todaySales,
        bills_count: localRes.metrics.billsCount,
        pending_udhar: localRes.metrics.pendingUdhar,
        products_count: localRes.metrics.productsCount,
        customers_count: localRes.metrics.customersCount,
      },
    });
    speakText(localRes.spokenResponse);
    setLoading(false);
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {}
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                <Sparkles className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <h3 className="font-extrabold text-base">Store AI Voice Assistant</h3>
                <p className="text-xs text-violet-200">
                  Ask daily sales, pending Udhar, product reports &amp; stock
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full bg-white/10 p-1.5 text-white hover:bg-white/20 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Quick Voice Prompt Suggestions */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Tap to Ask (or speak):
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setQuery("Today's total sales collection?");
                  handleSendQuery("Today's total sales collection?");
                }}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-left text-xs font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50/50 transition active:scale-95"
              >
                <TrendingUp className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="truncate">Today's Sales &amp; Bills</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setQuery("How much Udhar is pending in Khata?");
                  handleSendQuery("How much Udhar is pending in Khata?");
                }}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-left text-xs font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50/50 transition active:scale-95"
              >
                <BookOpen className="h-4 w-4 text-rose-600 shrink-0" />
                <span className="truncate">Pending Udhar / Khata</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setQuery("What is the top selling item?");
                  handleSendQuery("What is the top selling item?");
                }}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-left text-xs font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50/50 transition active:scale-95"
              >
                <Package className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="truncate">Top Selling Grocery</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setQuery("How many customers registered?");
                  handleSendQuery("How many customers registered?");
                }}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-left text-xs font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50/50 transition active:scale-95"
              >
                <Users className="h-4 w-4 text-blue-600 shrink-0" />
                <span className="truncate">Customer Base</span>
              </button>
            </div>
          </div>

          {/* AI Response Card */}
          {response && (
            <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/60 to-indigo-50/30 p-4 shadow-sm animate-in zoom-in-95">
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-violet-700">
                  <Sparkles className="h-3.5 w-3.5" /> Assistant Response
                </span>
                <button
                  type="button"
                  onClick={() => speakText(response.spoken_response)}
                  className="flex items-center gap-1 rounded-lg bg-violet-100 px-2 py-1 text-[11px] font-bold text-violet-700 hover:bg-violet-200"
                  title="Listen again"
                >
                  <Volume2 className="h-3.5 w-3.5" /> Speak
                </button>
              </div>

              <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                {response.spoken_response}
              </p>

              {/* Metric Breakdown Badges */}
              {response.metrics && (
                <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-violet-100 text-xs">
                  <span className="rounded-lg bg-emerald-100 px-2.5 py-1 font-bold text-emerald-800">
                    💰 Sales: ₹{(response.metrics.today_sales || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="rounded-lg bg-rose-100 px-2.5 py-1 font-bold text-rose-800">
                    📒 Udhar: ₹{(response.metrics.pending_udhar || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="rounded-lg bg-blue-100 px-2.5 py-1 font-bold text-blue-800">
                    🧾 Bills: {response.metrics.bills_count || 0}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Voice & Text Input Section */}
          <div className="pt-2">
            <div className="relative flex items-center">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendQuery();
                }}
                placeholder="Ask about sales, udhar, bills, stock..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-4 pr-24 text-xs font-medium outline-none transition focus:border-violet-500 focus:bg-white"
              />

              <div className="absolute right-2 flex items-center gap-1">
                {/* Voice Mic Button */}
                <button
                  type="button"
                  onClick={isListening ? handleStopListening : handleStartListening}
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                    isListening
                      ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-200'
                      : 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                  }`}
                  title={isListening ? 'Stop listening' : 'Speak to AI'}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>

                {/* Send Button */}
                <button
                  type="button"
                  disabled={loading || !query.trim()}
                  onClick={() => handleSendQuery()}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-800 disabled:opacity-40"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
            {isListening && (
              <p className="mt-2 text-center text-xs font-bold text-rose-600 animate-pulse">
                🎙️ Listening... Please speak your question now
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

