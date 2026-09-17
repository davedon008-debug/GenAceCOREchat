import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

export default function Logo({ size = 44, variant = 'full', showTagline = false }) {
  const leftGradId = "m-genace-left-ribbon-v2";
  const rightGradId = "m-genace-right-metallic-v2";
  const crossGradId = "m-genace-cross-fold-v2";

  const MarkSvg = ({ svgSize }) => (
    <Svg width={svgSize} height={svgSize} viewBox="0 0 500 500" fill="none">
      <Defs>
        {/* Main Ribbon Gradient (Electric Cyan -> Blue -> Purple -> Violet) */}
        <LinearGradient id={leftGradId} x1="100" y1="440" x2="260" y2="60" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#00D2FF" />
          <Stop offset="25%" stopColor="#0072FF" />
          <Stop offset="60%" stopColor="#7C3AED" />
          <Stop offset="90%" stopColor="#A855F7" />
          <Stop offset="100%" stopColor="#C084FC" />
        </LinearGradient>

        {/* Metallic Silver Right Fold Gradient (White -> Light Gray -> Slate) */}
        <LinearGradient id={rightGradId} x1="280" y1="120" x2="380" y2="440" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="20%" stopColor="#E2E8F0" />
          <Stop offset="65%" stopColor="#CBD5E1" />
          <Stop offset="100%" stopColor="#64748B" />
        </LinearGradient>

        {/* Folded Crossbar Facet Gradient (Indigo to Bright Purple) */}
        <LinearGradient id={crossGradId} x1="170" y1="320" x2="320" y2="220" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#3B82F6" />
          <Stop offset="45%" stopColor="#6366F1" />
          <Stop offset="100%" stopColor="#9333EA" />
        </LinearGradient>
      </Defs>

      {/* 1. RIGHT DIAGONAL LEG (Metallic Silver Fold) */}
      <Path
        d="M260 145 L308 145 L380 430 L318 430 L272 260 Z"
        fill={`url(#${rightGradId})`}
      />

      {/* 2. FOLDED CROSSBAR RIBBON (Sharp fold pointing right) */}
      <Path
        d="M178 305 L325 210 L275 270 L218 305 Z"
        fill={`url(#${crossGradId})`}
      />

      {/* 3. MAIN OUTER RIBBON LOOP (Left leg to top apex, folding over) */}
      <Path
        d="M120 430 L245 70 C255 52 278 55 292 78 L305 135 L265 215 L215 310 L172 430 H120 Z"
        fill={`url(#${leftGradId})`}
      />
    </Svg>
  );

  if (variant === 'icon') {
    return (
      <View style={[styles.iconContainer, { width: size, height: size, borderRadius: size * 0.3 }]}>
        <MarkSvg svgSize={size * 0.65} />
      </View>
    );
  }

  if (variant === 'mark') {
    return <MarkSvg svgSize={size} />;
  }

  return (
    <View style={styles.fullContainer}>
      <View style={styles.row}>
        <MarkSvg svgSize={size} />
        <View style={styles.textColumn}>
          <View style={styles.titleRow}>
            <Text style={styles.genText}>Gen</Text>
            <Text style={styles.aceText}>Ace</Text>
          </View>
          {showTagline && (
            <Text style={styles.taglineText}>NEXT GENERATION. EXCELLENCE.</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    backgroundColor: '#090d18',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  fullContainer: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textColumn: {
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  genText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  aceText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#A855F7',
    letterSpacing: -0.5,
    marginLeft: 2,
  },
  taglineText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.5,
    marginTop: 2,
  },
});
