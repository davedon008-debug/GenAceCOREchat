import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageSquare, Flame, Trash2, Plus, Smile, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '😂', '😮', '😢', '🎉'];

const EXTENDED_EMOJI_CATEGORIES = [
  {
    name: 'REACTIONS',
    emojis: ['👍', '👎', '❤️', '💖', '💗', '🔥', '✨', '⭐', '💯', '🎉', '🙏', '👏', '🙌', '🤝', '💪', '🫡']
  },
  {
    name: 'FACES & EXPRESSIONS',
    emojis: ['😂', '🤣', '😍', '🥰', '😎', '🥳', '😮', '🤯', '😭', '😢', '😡', '🤔', '🤫', '😴', '😜', '😇', '🧐', '😬']
  },
  {
    name: 'SYMBOLS & VIBES',
    emojis: ['🚀', '💡', '📌', '🏆', '🎯', '⚡', '💎', '🍕', '☕', '🍺', '💬', '🔒', '👀', '🌙', '🌈', '🍀', '💣', '👑']
  }
];

export default function MessageActionModal({
  visible,
  message,
  isMe,
  onClose,
  onReact,
  onReply,
  onBurn,
  onDelete
}) {
  const { colors: dynamicColors, isLight } = useTheme();
  const [showMoreEmojis, setShowMoreEmojis] = useState(false);

  if (!message || !visible) return null;

  const handleClose = () => {
    setShowMoreEmojis(false);
    onClose();
  };

  const handleSelectEmoji = (emoji) => {
    onReact(message._id, emoji);
    handleClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={handleClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.modalCard, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.cardBorder }]}
        >
          {/* Quick Reaction Bar */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: dynamicColors.textMuted }]}>EXPRESS REACTION</Text>
          </View>

          <View style={styles.quickEmojiRow}>
            {QUICK_EMOJIS.map(emoji => (
              <TouchableOpacity
                key={emoji}
                style={[styles.emojiBtn, { backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255, 255, 255, 0.05)' }]}
                onPress={() => handleSelectEmoji(emoji)}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}

            {/* Expand / Collapse Button */}
            <TouchableOpacity
              style={[
                styles.emojiBtn,
                styles.moreBtn,
                { backgroundColor: showMoreEmojis ? 'rgba(99, 102, 241, 0.2)' : (isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255, 255, 255, 0.05)') }
              ]}
              onPress={() => setShowMoreEmojis(prev => !prev)}
            >
              {showMoreEmojis ? (
                <ChevronUp size={20} color={dynamicColors.primary} />
              ) : (
                <Plus size={20} color={dynamicColors.text} />
              )}
            </TouchableOpacity>
          </View>

          {/* Expandable Extended Emoji Picker */}
          {showMoreEmojis && (
            <View style={[styles.extendedBox, { backgroundColor: isLight ? '#f8fafc' : 'rgba(0, 0, 0, 0.3)', borderColor: dynamicColors.cardBorder }]}>
              <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {EXTENDED_EMOJI_CATEGORIES.map(category => (
                  <View key={category.name} style={{ marginBottom: 12 }}>
                    <Text style={[styles.categoryTitle, { color: dynamicColors.textMuted }]}>{category.name}</Text>
                    <View style={styles.gridRow}>
                      {category.emojis.map(emoji => (
                        <TouchableOpacity
                          key={emoji}
                          style={styles.gridEmojiBtn}
                          onPress={() => handleSelectEmoji(emoji)}
                        >
                          <Text style={styles.gridEmojiText}>{emoji}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Action Items List */}
          <View style={[styles.actionsList, { borderTopColor: dynamicColors.cardBorder }]}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                onReply(message);
                handleClose();
              }}
            >
              <View style={[styles.actionIconPill, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                <MessageSquare size={16} color={dynamicColors.primary} />
              </View>
              <Text style={[styles.actionText, { color: dynamicColors.text }]}>Reply to Message</Text>
            </TouchableOpacity>

            {isMe && message.privacyMode === 'burn' && !message.isBurned && (
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => {
                  onBurn(message._id);
                  handleClose();
                }}
              >
                <View style={[styles.actionIconPill, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Flame size={16} color={colors.danger} />
                </View>
                <Text style={[styles.actionText, { color: colors.danger }]}>
                  Burn Message Now
                </Text>
              </TouchableOpacity>
            )}

            {/* Delete for Me (Available for all messages) */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                onDelete(message._id || message.id || message, 'me');
                handleClose();
              }}
            >
              <View style={[styles.actionIconPill, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                <Trash2 size={16} color={colors.danger} />
              </View>
              <Text style={[styles.actionText, { color: dynamicColors.text }]}>
                Delete for Me
              </Text>
            </TouchableOpacity>

            {/* Delete for Everyone (Sender only) */}
            {isMe && (
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => {
                  onDelete(message._id || message.id || message, 'everyone');
                  handleClose();
                }}
              >
                <View style={[styles.actionIconPill, { backgroundColor: 'rgba(239, 68, 68, 0.25)' }]}>
                  <Trash2 size={16} color={colors.danger} />
                </View>
                <Text style={[styles.actionText, { color: colors.danger }]}>
                  Delete for Everyone
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  sectionHeader: {
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  quickEmojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emojiBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreBtn: {
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  emojiText: {
    fontSize: 20,
  },
  extendedBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginTop: 4,
  },
  categoryTitle: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  gridEmojiBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  gridEmojiText: {
    fontSize: 18,
  },
  actionsList: {
    gap: 4,
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  actionIconPill: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
});
