import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Plus,
  ChevronRight,
  Eye,
  VolumeX,
  Volume2,
  Clock
} from 'lucide-react-native';
import { getMediaUrl } from '../../config/api';

export default function StatusUpdatesListModal({
  visible,
  onClose,
  myStatuses = [],
  recentStatuses = [],
  viewedStatuses = [],
  mutedStatuses = [],
  activePersona,
  dynamicColors,
  themeMode,
  onPressMyStatus,
  onPressAddStatus,
  onPressGroup,
  onToggleUnmute
}) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'muted'
  const isLight = themeMode === 'light';
  const hasMyStatus = myStatuses && myStatuses.length > 0;

  const renderStatusGroupItem = ({ item, isMuted = false }) => {
    const author = item.persona;
    const authorName = author?.displayName || author?.username || 'User';
    const authorHandle = author?.username ? `@${author.username}` : '';
    const statusCount = item.statuses?.length || 1;
    const isSeen = !item.hasUnseen;

    return (
      <TouchableOpacity
        style={[
          styles.itemCard,
          {
            backgroundColor: dynamicColors.card || 'rgba(255,255,255,0.03)',
            borderColor: dynamicColors.cardBorder || 'rgba(255,255,255,0.06)'
          }
        ]}
        activeOpacity={0.7}
        onPress={() => onPressGroup && onPressGroup(item)}
      >
        <View style={styles.avatarWrapper}>
          <View
            style={[
              styles.avatarRing,
              isSeen || isMuted
                ? [styles.ringViewed, { borderColor: isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.25)' }]
                : [styles.ringActive, { borderColor: dynamicColors.primary || '#6366f1' }]
            ]}
          >
            <Image
              source={{ uri: getMediaUrl(author?.avatar, authorName) }}
              style={styles.avatarImage}
            />
          </View>
        </View>

        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={[styles.authorName, { color: dynamicColors.text || '#ffffff' }]}>
            {authorName}
          </Text>
          <Text style={[styles.subText, { color: dynamicColors.textMuted || '#94a3b8' }]}>
            {statusCount} update{statusCount > 1 ? 's' : ''} • {isMuted ? 'Muted' : (isSeen ? 'Viewed' : 'New update')}
          </Text>
        </View>

        {isMuted ? (
          <TouchableOpacity
            style={styles.unmuteBtn}
            onPress={() => onToggleUnmute && onToggleUnmute(author._id)}
          >
            <Volume2 size={16} color={dynamicColors.primary || '#818cf8'} />
            <Text style={[styles.unmuteText, { color: dynamicColors.primary || '#818cf8' }]}>Unmute</Text>
          </TouchableOpacity>
        ) : (
          <ChevronRight size={18} color={dynamicColors.textMuted || '#64748b'} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: dynamicColors.background || '#0b101b' }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: dynamicColors.cardBorder || 'rgba(255,255,255,0.08)' }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={22} color={dynamicColors.text || '#ffffff'} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: dynamicColors.text || '#ffffff' }]}>
            Status Updates
          </Text>
          <TouchableOpacity onPress={onPressAddStatus} style={[styles.addBtn, { backgroundColor: dynamicColors.primary || '#6366f1' }]}>
            <Plus size={16} color="#ffffff" strokeWidth={3} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollBody} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* My Status Card */}
          <TouchableOpacity
            style={[
              styles.myStatusCard,
              {
                backgroundColor: dynamicColors.card || 'rgba(255,255,255,0.04)',
                borderColor: dynamicColors.cardBorder || 'rgba(255,255,255,0.08)'
              }
            ]}
            activeOpacity={0.8}
            onPress={() => {
              if (hasMyStatus) {
                onPressMyStatus && onPressMyStatus();
              } else {
                onPressAddStatus && onPressAddStatus();
              }
            }}
          >
            <View style={styles.avatarWrapper}>
              <View
                style={[
                  styles.avatarRing,
                  hasMyStatus
                    ? [styles.ringActive, { borderColor: dynamicColors.primary || '#6366f1' }]
                    : [styles.ringDashed, { borderColor: '#818cf8' }]
                ]}
              >
                <Image
                  source={{ uri: getMediaUrl(activePersona?.avatar, activePersona?.displayName) }}
                  style={styles.avatarImage}
                />
              </View>
              <View style={[styles.badgeBtn, { backgroundColor: dynamicColors.primary || '#6366f1' }]}>
                <Plus size={10} color="#ffffff" strokeWidth={3} />
              </View>
            </View>

            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.authorName, { color: dynamicColors.text || '#ffffff' }]}>
                My Status
              </Text>
              <Text style={[styles.subText, { color: dynamicColors.textMuted || '#94a3b8' }]}>
                {hasMyStatus ? `${myStatuses.length} active update${myStatuses.length > 1 ? 's' : ''}` : 'Tap to add status update'}
              </Text>
            </View>

            <ChevronRight size={18} color={dynamicColors.textMuted || '#64748b'} />
          </TouchableOpacity>

          {/* Recent Updates Section */}
          {recentStatuses.length > 0 && (
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionHeading, { color: dynamicColors.textSecondary || '#94a3b8' }]}>
                RECENT UPDATES
              </Text>
              {recentStatuses.map((item, idx) => (
                <View key={item.persona?._id || idx}>
                  {renderStatusGroupItem({ item })}
                </View>
              ))}
            </View>
          )}

          {/* Viewed Updates Section */}
          {viewedStatuses.length > 0 && (
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionHeading, { color: dynamicColors.textSecondary || '#94a3b8' }]}>
                VIEWED UPDATES
              </Text>
              {viewedStatuses.map((item, idx) => (
                <View key={item.persona?._id || idx}>
                  {renderStatusGroupItem({ item })}
                </View>
              ))}
            </View>
          )}

          {/* Muted Updates Section */}
          {mutedStatuses.length > 0 && (
            <View style={styles.sectionBlock}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <VolumeX size={14} color="#64748b" style={{ marginRight: 6 }} />
                <Text style={[styles.sectionHeading, { color: '#64748b', marginBottom: 0 }]}>
                  MUTED UPDATES ({mutedStatuses.length})
                </Text>
              </View>
              {mutedStatuses.map((item, idx) => (
                <View key={item.persona?._id || idx}>
                  {renderStatusGroupItem({ item, isMuted: true })}
                </View>
              ))}
            </View>
          )}

          {recentStatuses.length === 0 && viewedStatuses.length === 0 && mutedStatuses.length === 0 && (
            <View style={styles.emptyState}>
              <Clock size={40} color="#64748b" style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyTitle, { color: dynamicColors.text || '#ffffff' }]}>
                No Recent Status Updates
              </Text>
              <Text style={[styles.emptySub, { color: dynamicColors.textMuted || '#94a3b8' }]}>
                Status updates from your friends will appear here for 24 hours. Post a status to get started!
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1
  },
  closeBtn: {
    padding: 6
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800'
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 4
  },
  scrollBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12
  },
  myStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8
  },
  avatarWrapper: {
    position: 'relative'
  },
  avatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    padding: 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  ringDashed: {
    borderStyle: 'dashed',
    borderWidth: 1.8
  },
  ringActive: {
    borderWidth: 2
  },
  ringViewed: {
    borderWidth: 1.5
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22
  },
  badgeBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0b101b'
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700'
  },
  subText: {
    fontSize: 12,
    marginTop: 2
  },
  sectionBlock: {
    marginBottom: 20
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10
  },
  unmuteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.15)'
  },
  unmuteText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18
  }
});
