import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Zap, Lock, Globe, X, ListTodo, BarChart2, CheckSquare, Square, Plus } from 'lucide-react-native';
import api from '../config/api';
import { colors } from '../theme/colors';

export default function SpaceCanvasModal({ visible, spaceId, onClose }) {
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'polls'
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [polls, setPolls] = useState([]);

  // Create Modal Forms
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showPollForm, setShowPollForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [submitting, setSubmitting] = useState(false);

  const fetchSpaceDetails = async () => {
    if (!spaceId) return;
    try {
      setLoading(true);
      const res = await api.get(`/spaces/${spaceId}`);
      if (res.data?.success) {
        setTasks(res.data.space?.tasks || []);
        setPolls(res.data.space?.polls || []);
      }
    } catch (err) {
      console.error('Fetch space details error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchSpaceDetails();
    }
  }, [visible, spaceId]);

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/spaces/${spaceId}/tasks`, { title: taskTitle.trim() });
      if (res.data?.success) {
        setTasks(prev => [...prev, res.data.task]);
        setTaskTitle('');
        setShowTaskForm(false);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleTask = async (taskId, currentStatus) => {
    const nextStatus = currentStatus === 'done' ? 'todo' : 'done';
    try {
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: nextStatus } : t));
      await api.patch(`/spaces/tasks/${taskId}`, { status: nextStatus });
    } catch (err) {
      fetchSpaceDetails();
    }
  };

  const handleCreatePoll = async () => {
    const validOpts = pollOptions.filter(o => o.trim().length > 0);
    if (!pollQuestion.trim() || validOpts.length < 2) {
      Alert.alert('Invalid Poll', 'Please provide a question and at least 2 options.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/spaces/${spaceId}/polls`, {
        question: pollQuestion.trim(),
        options: validOpts
      });
      if (res.data?.success) {
        setPolls(prev => [...prev, res.data.poll]);
        setPollQuestion('');
        setPollOptions(['', '']);
        setShowPollForm(false);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to publish poll');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVotePoll = async (pollId, optionIndex) => {
    try {
      const res = await api.post(`/spaces/polls/${pollId}/vote`, { optionIndex });
      if (res.data?.success) {
        setPolls(prev => prev.map(p => p._id === pollId ? res.data.poll : p));
      }
    } catch (err) {
      console.error('Vote error:', err);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(99, 102, 241, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.titleText}>Space Canvas</Text>
                <Text style={styles.subtitleText}>Collaborative Tasks & Decision Polls</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Sub-navigation Tabs */}
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.navBtn, activeTab === 'tasks' && styles.navBtnActive]}
              onPress={() => setActiveTab('tasks')}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ListTodo size={14} color={activeTab === 'tasks' ? colors.white : colors.textMuted} />
                <Text style={[styles.navBtnText, activeTab === 'tasks' && styles.navBtnTextActive]}>
                  Tasks ({tasks.length})
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navBtn, activeTab === 'polls' && styles.navBtnActive]}
              onPress={() => setActiveTab('polls')}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <BarChart2 size={14} color={activeTab === 'polls' ? colors.white : colors.textMuted} />
                <Text style={[styles.navBtnText, activeTab === 'polls' && styles.navBtnTextActive]}>
                  Polls ({polls.length})
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Content Body */}
          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24, gap: 14 }}>
            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
            ) : activeTab === 'tasks' ? (
              /* TASKS SECTION */
              <View style={{ gap: 12 }}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>SPACE DELIVERABLES</Text>
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => setShowTaskForm(prev => !prev)}
                  >
                    <Text style={styles.addBtnText}>+ Add Task</Text>
                  </TouchableOpacity>
                </View>

                {/* New Task Inline Form */}
                {showTaskForm && (
                  <View style={styles.formCard}>
                    <TextInput
                      style={styles.input}
                      placeholder="Task deliverable title..."
                      placeholderTextColor={colors.textMuted}
                      value={taskTitle}
                      onChangeText={setTaskTitle}
                    />
                    <View style={styles.formActions}>
                      <TouchableOpacity onPress={() => setShowTaskForm(false)}>
                        <Text style={styles.cancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.submitBtn, submitting && styles.btnDisabled]}
                        disabled={submitting}
                        onPress={handleCreateTask}
                      >
                        <Text style={styles.submitBtnText}>Create Task</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {tasks.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <ListTodo size={24} color={colors.textMuted} />
                    <Text style={styles.emptyTitle}>No Tasks Created</Text>
                    <Text style={styles.emptySub}>Add deliverables to track action items for team members.</Text>
                  </View>
                ) : (
                  tasks.map(t => {
                    const isDone = t.status === 'done';
                    return (
                      <TouchableOpacity
                        key={t._id}
                        style={[styles.taskRow, isDone && styles.taskRowDone]}
                        onPress={() => handleToggleTask(t._id, t.status)}
                      >
                        {isDone ? (
                          <CheckSquare size={18} color={colors.success} />
                        ) : (
                          <Square size={18} color={colors.textMuted} />
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.taskTitleText, isDone && styles.taskTextDone]}>
                            {t.title}
                          </Text>
                          <Text style={styles.taskCreatorText}>
                            By {t.creatorPersonaId?.displayName || t.creatorPersonaId?.username || 'Member'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            ) : (
              /* POLLS SECTION */
              <View style={{ gap: 12 }}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>DECISION POLLS</Text>
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => setShowPollForm(prev => !prev)}
                  >
                    <Text style={styles.addBtnText}>+ Create Poll</Text>
                  </TouchableOpacity>
                </View>

                {/* New Poll Inline Form */}
                {showPollForm && (
                  <View style={styles.formCard}>
                    <TextInput
                      style={styles.input}
                      placeholder="Poll Question..."
                      placeholderTextColor={colors.textMuted}
                      value={pollQuestion}
                      onChangeText={setPollQuestion}
                    />

                    {pollOptions.map((opt, i) => (
                      <TextInput
                        key={i}
                        style={[styles.input, { marginTop: 6 }]}
                        placeholder={`Option ${i + 1}`}
                        placeholderTextColor={colors.textMuted}
                        value={opt}
                        onChangeText={val => {
                          const copy = [...pollOptions];
                          copy[i] = val;
                          setPollOptions(copy);
                        }}
                      />
                    ))}

                    <TouchableOpacity
                      onPress={() => setPollOptions(prev => [...prev, ''])}
                      style={{ marginTop: 4 }}
                    >
                      <Text style={styles.addOptText}>+ Add Option</Text>
                    </TouchableOpacity>

                    <View style={styles.formActions}>
                      <TouchableOpacity onPress={() => setShowPollForm(false)}>
                        <Text style={styles.cancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.submitBtn, submitting && styles.btnDisabled]}
                        disabled={submitting}
                        onPress={handleCreatePoll}
                      >
                        <Text style={styles.submitBtnText}>Publish Poll</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {polls.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <BarChart2 size={24} color={colors.textMuted} />
                    <Text style={styles.emptyTitle}>No Polls Available</Text>
                    <Text style={styles.emptySub}>Publish a decision poll to gather feedback from members.</Text>
                  </View>
                ) : (
                  polls.map(p => {
                    const totalVotes = p.options.reduce((acc, o) => acc + (o.votes?.length || 0), 0);

                    return (
                      <View key={p._id} style={styles.pollCard}>
                        <Text style={styles.pollQuestion}>{p.question}</Text>
                        <View style={{ gap: 8, marginTop: 8 }}>
                          {p.options.map((opt, optIdx) => {
                            const count = opt.votes?.length || 0;
                            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

                            return (
                              <TouchableOpacity
                                key={optIdx}
                                style={styles.pollOptBtn}
                                onPress={() => handleVotePoll(p._id, optIdx)}
                              >
                                {/* Progress background bar */}
                                <View style={[styles.pollProgressFill, { width: `${pct}%` }]} />
                                <View style={styles.pollOptContent}>
                                  <Text style={styles.pollOptText}>{opt.optionText}</Text>
                                  <Text style={styles.pollOptPct}>{count} ({pct}%)</Text>
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgeIcon: {
    fontSize: 22,
  },
  titleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  subtitleText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  navRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: 10,
  },
  navBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
  },
  navBtnActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  navBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  navBtnTextActive: {
    color: colors.white,
  },
  body: {
    padding: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  addBtnText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  formCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 10,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.white,
    fontSize: 13,
  },
  addOptText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  formActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 6,
  },
  cancelText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyBox: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.white,
  },
  emptySub: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  taskRowDone: {
    opacity: 0.5,
  },
  taskTitleText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  taskTextDone: {
    textDecorationLine: 'line-through',
  },
  taskCreatorText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  pollCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  pollQuestion: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.white,
  },
  pollOptBtn: {
    position: 'relative',
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.inputBg,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  pollProgressFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
  },
  pollOptContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  pollOptText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  pollOptPct: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
});
