'use client';

import { useState } from 'react';
import { Bot, Sparkles, CheckCircle2, ListTodo, Send, X, ShieldAlert } from 'lucide-react';
import api from '../lib/api';

export default function AIToolbar({ conversationId, spaceId, onClose }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [customQuery, setCustomQuery] = useState('');

  const executeAIQuery = async (action, queryText = null) => {
    setLoading(true);
    setResult(null);

    try {
      const res = await api.post('/ai/query', {
        action,
        conversationId,
        spaceId,
        queryText
      });

      if (res.data.success) {
        setResult(res.data.result);
      }
    } catch (err) {
      console.error('AI Query failed:', err);
      setResult({ summary: 'Failed to execute AI request. Ensure room context is active.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-full sm:w-80 h-full glass-panel border-l border-white/10 flex flex-col p-4 z-50 overflow-y-auto shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">AI Space Context</h3>
        </div>
        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Permission Security Banner */}
      <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] flex items-center gap-2 mb-4">
        <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0" />
        <span>Privacy-Scoped: AI processes only messages within this room boundary.</span>
      </div>

      {/* Quick Trigger Cards */}
      <div className="space-y-2 mb-4">
        <button
          onClick={() => executeAIQuery('CATCH_UP')}
          disabled={loading}
          className="w-full flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/10 text-left text-xs font-medium text-gray-200 transition"
        >
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <div>
            <p className="font-semibold text-white">Catch Me Up</p>
            <p className="text-[10px] text-gray-400">Summarize recent space activity</p>
          </div>
        </button>

        <button
          onClick={() => executeAIQuery('EXTRACT_DECISIONS')}
          disabled={loading}
          className="w-full flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-purple-500/10 text-left text-xs font-medium text-gray-200 transition"
        >
          <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
          <div>
            <p className="font-semibold text-white">What Did We Decide?</p>
            <p className="text-[10px] text-gray-400">Aggregate confirmed choices & agreements</p>
          </div>
        </button>

        <button
          onClick={() => executeAIQuery('EXTRACT_TASKS')}
          disabled={loading}
          className="w-full flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-amber-500/50 hover:bg-amber-500/10 text-left text-xs font-medium text-gray-200 transition"
        >
          <ListTodo className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <p className="font-semibold text-white">Extract Action Items</p>
            <p className="text-[10px] text-gray-400">Identify action deliverables into tasks</p>
          </div>
        </button>
      </div>

      {/* Custom Query Input */}
      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Ask AI about this space..."
          value={customQuery}
          onChange={e => setCustomQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && customQuery.trim()) {
              executeAIQuery('CUSTOM_QUERY', customQuery.trim());
            }
          }}
          className="w-full pl-3 pr-9 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500/50"
        />
        <button
          onClick={() => customQuery.trim() && executeAIQuery('CUSTOM_QUERY', customQuery.trim())}
          className="absolute right-2 top-2 text-cyan-400 hover:text-cyan-300"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* AI Output Display Card */}
      {loading && (
        <div className="p-4 rounded-xl glass-panel text-center text-xs text-cyan-400 animate-pulse">
          🤖 Analyzing room context & message stream...
        </div>
      )}

      {result && (
        <div className="p-4 rounded-xl glass-panel space-y-3 text-xs border-cyan-500/30">
          <h4 className="font-bold text-cyan-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> AI Analysis Output
          </h4>

          {result.summary && <p className="text-gray-200 leading-relaxed">{result.summary}</p>}
          {result.answer && <p className="text-gray-200 leading-relaxed">{result.answer}</p>}

          {result.topics && (
            <div className="space-y-1">
              <p className="font-semibold text-gray-300">Topics & Highlights:</p>
              {result.topics.map((t, i) => (
                <p key={i} className="text-gray-400 text-[11px]">{t}</p>
              ))}
            </div>
          )}

          {result.decisions && (
            <div className="space-y-1">
              <p className="font-semibold text-purple-300">Decisions Found:</p>
              {result.decisions.map((d, i) => (
                <div key={i} className="p-2 rounded bg-purple-500/10 text-[11px] text-purple-200 border border-purple-500/20">
                  <p className="font-medium">{d.author}:</p>
                  <p>{d.text}</p>
                </div>
              ))}
            </div>
          )}

          {result.actionItems && (
            <div className="space-y-1">
              <p className="font-semibold text-amber-300">Extracted Action Items:</p>
              {result.actionItems.map((item, i) => (
                <div key={i} className="p-2 rounded bg-amber-500/10 text-[11px] text-amber-200 border border-amber-500/20">
                  <p className="font-medium">Deliverable:</p>
                  <p>{item.title}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
