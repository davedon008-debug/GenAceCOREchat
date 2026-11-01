import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions
} from 'react-native';
import { Plus, ChevronRight } from 'lucide-react-native';
import { getMediaUrl, createInitialsAvatar } from '../../config/api';

const { width } = Dimensions.get('window');

export default function StatusRail({
  myStatuses = [],
  recentStatuses = [],
  viewedStatuses = [],
  activePersona,
  dynamicColors,
  themeMode,
  onPressMyStatus,
  onPressAddStatus,
  onPressOtherStatus,
  onPressSeeAll
}) {
  const hasMyStatus = myStatuses && myStatuses.length > 0;
  const isLight = themeMode === 'light';

  // Total updates count for others
  const allOtherStatuses = [...recentStatuses, ...viewedStatuses];

  return (
    <View style={styles.container}>
      {/* Header Row: | STATUS    See updates > */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithBar}>
          <View style={[styles.verticalBar, { backgroundColor: dynamicColors.primary || '#6366f1' }]} />
          <Text style={[styles.sectionTitle, { color: dynamicColors.text || '#ffffff' }]}>
            STATUS
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.seeUpdatesBtn} 
          onPress={onPressSeeAll}
          activeOpacity={0.7}
        >
          <Text style={[styles.seeUpdatesText, { color: dynamicColors.primary || '#818cf8' }]}>
            See updates
          </Text>
          <ChevronRight size={14} color={dynamicColors.primary || '#818cf8'} style={{ marginLeft: 2 }} />
        </TouchableOpacity>
      </View>

      {/* Horizontal Story Rail */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. My Status Item */}
        <TouchableOpacity
          style={styles.statusItem}
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
            {/* Circular container */}
            <View
              style={[
                styles.avatarRing,
                hasMyStatus
                  ? [styles.ringActive, { borderColor: dynamicColors.primary || '#6366f1' }]
                  : [
                      styles.ringDashed,
                      {
                        borderColor: isLight ? 'rgba(99, 102, 241, 0.45)' : 'rgba(129, 140, 248, 0.45)',
                        backgroundColor: isLight ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255, 255, 255, 0.03)'
                      }
                    ]
              ]}
            >
              {activePersona?.avatar ? (
                <Image
                  source={{ uri: getMediaUrl(activePersona.avatar, activePersona.displayName) }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={[styles.initialsAvatar, { backgroundColor: '#312e81' }]}>
                  <Text style={styles.initialsText}>
                    {(activePersona?.displayName || activePersona?.username || 'ME').substring(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}

              {/* Centered big plus if no avatar and no status */}
              {!hasMyStatus && !activePersona?.avatar && (
                <View style={styles.centerPlusOverlay}>
                  <Plus size={26} color={dynamicColors.primary || '#818cf8'} />
                </View>
              )}
            </View>

            {/* Small Plus / Add Badge at bottom-right */}
            <TouchableOpacity
              style={[styles.badgeAddBtn, { backgroundColor: dynamicColors.primary || '#6366f1' }]}
              activeOpacity={0.8}
              onPress={onPressAddStatus}
            >
              <Plus size={12} color="#ffffff" strokeWidth={3} />
            </TouchableOpacity>
          </View>

          {/* Texts */}
          <Text
            style={[styles.statusName, { color: dynamicColors.text || '#ffffff' }]}
            numberOfLines={1}
          >
            My Status
          </Text>
          <Text
            style={[
              styles.statusSub,
              { color: hasMyStatus ? (dynamicColors.primary || '#818cf8') : (dynamicColors.textMuted || '#94a3b8') }
            ]}
            numberOfLines={1}
          >
            {hasMyStatus ? `${myStatuses.length} update${myStatuses.length > 1 ? 's' : ''}` : 'Add update'}
          </Text>
        </TouchableOpacity>

        {/* 2. Other Users' Statuses */}
        {allOtherStatuses.map((group, index) => {
          const author = group.persona;
          const statusCount = group.statuses?.length || 1;
          const isSeen = !group.hasUnseen;
          const authorName = author?.displayName || author?.username || 'User';
          const authorHandle = author?.username ? `@${author.username}` : '';
          const authorInitials = authorName.replace(/^@/, '').substring(0, 2).toUpperCase();

          return (
            <TouchableOpacity
              key={author?._id || index}
              style={styles.statusItem}
              activeOpacity={0.8}
              onPress={() => onPressOtherStatus && onPressOtherStatus(group)}
            >
              <View style={styles.avatarWrapper}>
                {/* Active or Viewed Ring around Avatar */}
                <View
                  style={[
                    styles.avatarRing,
                    isSeen
                      ? [styles.ringViewed, { borderColor: isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.25)' }]
                      : [styles.ringActive, { borderColor: dynamicColors.primary || '#818cf8' }]
                  ]}
                >
                  {author?.avatar ? (
                    <Image
                      source={{ uri: getMediaUrl(author.avatar, authorName) }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View
                      style={[
                        styles.initialsAvatar,
                        {
                          backgroundColor: isSeen
                            ? (isLight ? '#cbd5e1' : '#334155')
                            : (index % 2 === 0 ? '#6366f1' : '#8b5cf6')
                        }
                      ]}
                    >
                      <Text style={[styles.initialsText, { color: '#ffffff' }]}>
                        {authorInitials}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Status Dot Indicator at bottom right */}
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: isSeen ? '#64748b' : (dynamicColors.primary || '#818cf8'),
                      borderColor: isLight ? '#ffffff' : '#0f172a'
                    }
                  ]}
                />
              </View>

              {/* Author Name */}
              <Text
                style={[styles.statusName, { color: dynamicColors.text || '#ffffff' }]}
                numberOfLines={1}
              >
                {authorName}
              </Text>

              {/* Subtitle Pill / Info */}
              {!isSeen && statusCount === 1 ? (
                <View style={[styles.newBadgePill, { backgroundColor: 'rgba(99, 102, 241, 0.25)' }]}>
                  <Text style={[styles.newBadgeText, { color: dynamicColors.primary || '#a5b4fc' }]}>
                    New
                  </Text>
                </View>
              ) : (
                <Text
                  style={[
                    styles.statusSub,
                    { color: isSeen ? (dynamicColors.textMuted || '#64748b') : (dynamicColors.textSecondary || '#cbd5e1') }
                  ]}
                  numberOfLines={1}
                >
                  {isSeen ? 'Viewed' : `${statusCount} updates`}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}

        {/* 3. See More Button (Chevron circle at end) */}
        {allOtherStatuses.length > 2 && (
          <TouchableOpacity
            style={[styles.statusItem, styles.moreCircleItem]}
            activeOpacity={0.7}
            onPress={onPressSeeAll}
          >
            <View
              style={[
                styles.moreCircleBg,
                {
                  backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255, 255, 255, 0.06)',
                  borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255, 255, 255, 0.12)'
                }
              ]}
            >
              <ChevronRight size={20} color={dynamicColors.textSecondary || '#94a3b8'} />
            </View>
            <Text style={[styles.moreText, { color: dynamicColors.textMuted || '#64748b' }]}>
              More
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    paddingHorizontal: 16
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  titleWithBar: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  verticalBar: {
    width: 3.5,
    height: 16,
    borderRadius: 2,
    marginRight: 8
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2
  },
  seeUpdatesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4
  },
  seeUpdatesText: {
    fontSize: 12,
    fontWeight: '600'
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 16
  },
  statusItem: {
    alignItems: 'center',
    width: 68,
    marginRight: 14
  },
  avatarWrapper: {
    width: 58,
    height: 58,
    position: 'relative',
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    padding: 2.5,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  ringDashed: {
    borderStyle: 'dashed',
    borderWidth: 1.8
  },
  ringActive: {
    borderWidth: 2.2
  },
  ringViewed: {
    borderWidth: 1.6
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 26
  },
  initialsAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center'
  },
  initialsText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff'
  },
  centerPlusOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center'
  },
  badgeAddBtn: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0b101b'
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.8
  },
  statusName: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    width: 66,
    marginBottom: 2
  },
  statusSub: {
    fontSize: 9.5,
    fontWeight: '500',
    textAlign: 'center',
    width: 66
  },
  newBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginTop: 1
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3
  },
  moreCircleItem: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'flex-start'
  },
  moreCircleBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6
  },
  moreText: {
    fontSize: 10,
    fontWeight: '600'
  }
});
