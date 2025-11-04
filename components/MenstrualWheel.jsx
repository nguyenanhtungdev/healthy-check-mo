import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Circle, G } from "react-native-svg";

// helpers to draw arcs
function polarToCartesian(cx, cy, r, angleDeg) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180.0;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  const d = [
    "M",
    start.x,
    start.y,
    "A",
    r,
    r,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(" ");
  return d;
}

const MenstrualWheel = ({
  lastPeriodStart,
  cycleLength = 28,
  periodLength = 5,
  size = 220,
}) => {
  // cycleLength and periodLength may come as strings
  const cycle = parseInt(String(cycleLength)) || 28;
  const period = parseInt(String(periodLength)) || 5;

  // angles: full circle = cycle days
  // period starts at angle 0 (top) and spans period/cycle * 360 degrees
  const periodAngle = (period / cycle) * 360;

  // estimate ovulation day ~ cycle - 14
  const ovulationDay = cycle - 14;
  const fertileStartDay = Math.max(ovulationDay - 5, 1);
  const fertileEndDay = Math.min(ovulationDay + 1, cycle - 1);
  const fertileAngleStart = ((fertileStartDay - 1) / cycle) * 360;
  const fertileAngleEnd = ((fertileEndDay - 1) / cycle) * 360;

  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size * 0.42;
  const rInner = size * 0.28;

  // background ring path (full circle drawn as two arcs)
  const bgPath = describeArc(cx, cy, rOuter, 0.01, 359.99);

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <G>
          {/* background ring */}
          <Path
            d={bgPath}
            stroke="#fff"
            strokeWidth={rOuter - rInner}
            strokeOpacity={0.06}
            strokeLinecap="butt"
            fill="none"
          />

          {/* period arc */}
          <Path
            d={describeArc(cx, cy, rOuter, 0, periodAngle || 1)}
            stroke="#ffb6c1"
            strokeWidth={rOuter - rInner}
            strokeLinecap="butt"
            fill="none"
          />

          {/* fertile arc */}
          <Path
            d={describeArc(cx, cy, rOuter, fertileAngleStart, fertileAngleEnd)}
            stroke="#f59e0b"
            strokeWidth={rOuter - rInner}
            strokeLinecap="butt"
            fill="none"
          />

          {/* center circle */}
          <Circle cx={cx} cy={cy} r={rInner - 2} fill="#fff" />
        </G>
      </Svg>
      <View style={styles.centerTextWrapper} pointerEvents="none">
        <Text style={styles.centerTitle}>Chu kỳ</Text>
        <Text
          style={styles.centerSubtitle}
        >{`${period} ngày / ${cycle} ngày`}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  centerTextWrapper: {
    position: "absolute",
    alignItems: "center",
  },
  centerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  centerSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
});

export default MenstrualWheel;
