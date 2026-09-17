'use client';

import { useState } from 'react';
import { CheckSquare, BarChart2, MessageSquare, Plus, CheckCircle, Circle, User } from 'lucide-react';

export default function SpaceCanvas({
  activeTab,
  onTabChange,
  tasks = [],
  polls = [],
  onAddTask,
  onToggleTask,
  onAddPoll,
  onVotePoll,
  children
}) {
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  const handleCreateTask = () => {
    if (!taskTitle.trim()) return;
    onAddTask(taskTitle.trim());
    setTaskTitle('');
    setShowTaskModal(false);
  };

  const handleCreatePoll = () => {
    const validOpts = pollOptions.filter(o => o.trim().length > 0);
    if (!pollQuestion.trim() || validOpts.length < 2) return;
    onAddPoll({ question: pollQuestion.trim(), options: validOpts });
    setPollQuestion('');
    setPollOptions(['', '']);
    setShowPollModal(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950/50">
      {/* Top Tab Sub-Navigation */}
      <div className="flex items-center gap-2 px-6 py-2 border-b border-white/10 bg-slate-900/60">
        <button
          onClick={() => onTabChange('chat')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'chat'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-md'
              : 'text-gray-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4" /> Live Chat
        </button>

        <button
          onClick={() => onTabChange('tasks')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'tasks'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-md'
              : 'text-gray-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          <CheckSquare className="w-4 h-4" /> Tasks ({tasks.length})
        </button>

        <button
          onClick={() => onTabChange('polls')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'polls'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-md'
              : 'text-gray-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          <BarChart2 className="w-4 h-4" /> Polls ({polls.length})
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'chat' && children}

        {/* TASKS TAB */}
        {activeTab === 'tasks' && (
          <div className="space-y-4 max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Space Tasks & Deliverables</h3>
                <p className="text-xs text-gray-400">Track and assign collaborative action items</p>
              </div>
              <button
                onClick={() => setShowTaskModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition shadow-lg shadow-purple-500/20"
              >
                <Plus className="w-4 h-4" /> Add New Task
              </button>
            </div>

            {tasks.length === 0 ? (
              <div className="text-center py-12 glass-panel rounded-2xl">
                <CheckSquare className="w-10 h-10 text-purple-400/50 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No tasks created in this space yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map(t => (
                  <div
                    key={t._id}
                    onClick={() => onToggleTask(t._id, t.status === 'done' ? 'todo' : 'done')}
                    className="flex items-center justify-between p-3.5 rounded-xl glass-panel glass-panel-interactive cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      {t.status === 'done' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400" />
                      )}
                      <span className={`text-xs font-medium ${t.status === 'done' ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                        {t.title}
                      </span>
                    </div>
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400 flex items-center gap-1">
                      <User className="w-3 h-3" /> {t.creatorPersonaId?.displayName || 'Member'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* POLLS TAB */}
        {activeTab === 'polls' && (
          <div className="space-y-4 max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Space Decision Polls</h3>
                <p className="text-xs text-gray-400">Vote on proposals and reach consensus</p>
              </div>
              <button
                onClick={() => setShowPollModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition shadow-lg shadow-amber-500/20"
              >
                <Plus className="w-4 h-4" /> Create Poll
              </button>
            </div>

            {polls.length === 0 ? (
              <div className="text-center py-12 glass-panel rounded-2xl">
                <BarChart2 className="w-10 h-10 text-amber-400/50 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No active polls in this space.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {polls.map(p => {
                  const totalVotes = p.options.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0);

                  return (
                    <div key={p._id} className="p-4 rounded-2xl glass-panel space-y-3">
                      <h4 className="text-sm font-bold text-white">{p.question}</h4>
                      <div className="space-y-2">
                        {p.options.map((opt, optIdx) => {
                          const voteCount = opt.votes?.length || 0;
                          const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

                          return (
                            <button
                              key={optIdx}
                              onClick={() => onVotePoll(p._id, optIdx)}
                              className="w-full text-left p-3 rounded-xl bg-white/5 border border-white/10 hover:border-amber-500/50 relative overflow-hidden transition"
                            >
                              <div
                                className="absolute left-0 top-0 bottom-0 bg-amber-500/20 transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                              <div className="relative flex items-center justify-between text-xs text-gray-200 font-medium">
                                <span>{opt.optionText}</span>
                                <span>{voteCount} votes ({pct}%)</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/15 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Create Space Task</h3>
            <input
              type="text"
              placeholder="Task title or deliverable..."
              value={taskTitle}
              onChange={e => setTaskTitle(e.target.value)}
              className="w-full p-3 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowTaskModal(false)}
                className="px-4 py-2 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Poll Modal */}
      {showPollModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/15 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Create Decision Poll</h3>
            <input
              type="text"
              placeholder="Poll Question..."
              value={pollQuestion}
              onChange={e => setPollQuestion(e.target.value)}
              className="w-full p-3 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
            />

            <div className="space-y-2">
              <p className="text-xs text-gray-400 font-medium">Poll Options</p>
              {pollOptions.map((opt, i) => (
                <input
                  key={i}
                  type="text"
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={e => {
                    const newOpts = [...pollOptions];
                    newOpts[i] = e.target.value;
                    setPollOptions(newOpts);
                  }}
                  className="w-full p-2.5 text-xs rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                />
              ))}
              <button
                onClick={() => setPollOptions([...pollOptions, ''])}
                className="text-xs text-amber-400 font-medium hover:underline"
              >
                + Add Another Option
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPollModal(false)}
                className="px-4 py-2 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePoll}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-white"
              >
                Publish Poll
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
