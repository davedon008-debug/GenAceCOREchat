import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../config/api';
import { colors } from '../theme/colors';

export default function AIToolbarModal({ visible, conversationId, spaceId, onClose }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [customQuery, setCustomQuery] = useState('');

  const executeAIQuery = async (action, queryText = null) => {
    setLoading(true);
    setResult(null);

    try {
      const payload = { action };
      if (conversationId) payload.conversationId = conversationId;
      if (spaceId) payload.spaceId = spaceId;
      if (queryText) payload.queryText = queryText;

      const res = await api.post('/ai/query', payload);
      if (res.data?.success) {
        setResult(res.data.result);
      }
    } catch (err) {
      console.error('AI Query failed:', err);
      setResult({ summary: 'Failed to process AI query. Please make sure messages exist in this room.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.botIcon}>🤖</Text>
              <View>
                <Text style={styles.titleText}>AI Space Assistant</Text>
                <Text style={styles.subtitleText}>Privacy-scoped room intelligence</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={{ gap: 14, paddingBottom: 24 }}>
            {/* Security Badge */}
            <View style={styles.secBadge}>
              <Text style={styles.secBadgeText}>🛡️ Scoped strictly to messages inside this chat room.</Text>
            </View>

            {/* Quick Trigger Buttons */}
            <Text style={styles.sectionLabel}>AI SMART TRIGGERS</Text>
            <View style={{ gap: 10 }}>
              <TouchableOpacity
                style={styles.triggerCard}
                onPress={() => executeAIQuery('CATCH_UP')}
                disabled={loading}
              >
                <Text style={styles.triggerIcon}>✨</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.triggerTitle}>Catch Me Up</Text>
                  <Text style={styles.triggerSub}>Summarize recent chat activity & key takeaways</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.triggerCard}
                onPress={() => executeAIQuery('EXTRACT_DECISIONS')}
                disabled={loading}
              >
                <Text style={styles.triggerIcon}>✅</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.triggerTitle}>What Did We Decide?</Text>
                  <Text style={styles.triggerSub}>Aggregate confirmed decisions & agreements</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.triggerCard}
                onPress={() => executeAIQuery('EXTRACT_TASKS')}
                disabled={loading}
              >
                <Text style={styles.triggerIcon}>📋</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.triggerTitle}>Extract Action Items</Text>
                  <Text style={styles.triggerSub}>Identify deliverables & turn them into tasks</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Custom Query Input */}
            <Text style={styles.sectionLabel}>CUSTOM ROOM PROMPT</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Ask AI anything about this chat..."
                placeholderTextColor={colors.textMuted}
                value={customQuery}
                onChangeText={setCustomQuery}
              />
              <TouchableOpacity
                style={[styles.sendBtn, !customQuery.trim() && styles.sendBtnDisabled]}
                disabled={!customQuery.trim() || loading}
                onPress={() => {
                  if (customQuery.trim()) {
                    executeAIQuery('CUSTOM_QUERY', customQuery.trim());
                  }
                }}
              >
                <Text style={styles.sendBtnText}>Ask</Text>
              </TouchableOpacity>
            </View>

            {/* Loading Indicator */}
            {loading && (
              <View style={styles.loadingCard}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Analyzing room messages...</Text>
              </View>
            )}

            {/* Result Output Card */}
            {result && !loading && (
              <View style={styles.resultCard}>
                <Text style={styles.resultHeader}>✨ AI Analysis Output</Text>

                {result.summary ? (
                  <Text style={styles.resultBody}>{result.summary}</Text>
                ) : null}

                {result.answer ? (
                  <Text style={styles.resultBody}>{result.answer}</Text>
                ) : null}

                {Array.isArray(result.topics) && result.topics.length > 0 && (
                  <View style={{ gap: 4, marginTop: 6 }}>
                    <Text style={styles.subHeader}>Key Highlights:</Text>
                    {result.topics.map((t, idx) => (
                      <Text key={idx} style={styles.bulletText}>• {t}</Text>
                    ))}
                  </View>
                )}

                {Array.isArray(result.decisions) && result.decisions.length > 0 && (
                  <View style={{ gap: 4, marginTop: 6 }}>
                    <Text style={styles.subHeader}>Decisions Reached:</Text>
                    {result.decisions.map((d, idx) => (
                      <View key={idx} style={styles.decisionItem}>
                        <Text style={styles.decisionAuthor}>{d.author || 'Member'}:</Text>
                        <Text style={styles.decisionText}>{d.text}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {Array.isArray(result.actionItems) && result.actionItems.length > 0 && (
                  <View style={{ gap: 4, marginTop: 6 }}>
                    <Text style={styles.subHeader}>Extracted Action Items:</Text>
                    {result.actionItems.map((item, idx) => (
                      <View key={idx} style={styles.taskItem}>
                        <Text style={styles.taskTitle}>• {item.title}</Text>
                      </View>
                    ))}
                  </View>
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
  botIcon: {
    fontSize: 24,
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
  body: {
    padding: 20,
  },
  secBadge: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderWidth: 1,
  },
  secBadgeText: {
    fontSize: 11,
    color: '#38bdf8',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  triggerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  triggerIcon: {
    fontSize: 18,
  },
  triggerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.white,
  },
  triggerSub: {
    fontSize: 10,
    color: colors.textMuted,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.white,
    fontSize: 13,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  loadingText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  resultCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    gap: 8,
  },
  resultHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary,
  },
  resultBody: {
    fontSize: 12,
    color: colors.white,
    lineHeight: 18,
  },
  subHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginTop: 4,
  },
  bulletText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  decisionItem: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  decisionAuthor: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#c084fc',
  },
  decisionText: {
    fontSize: 11,
    color: colors.white,
  },
  taskItem: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  taskTitle: {
    fontSize: 11,
    color: '#fbbf24',
    fontWeight: '600',
  },
});
