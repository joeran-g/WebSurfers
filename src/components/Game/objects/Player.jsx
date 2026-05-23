import { Group, Circle, Line, Rect } from "react-konva";
import { useTheme } from "../../../context/ThemeContext";

export default function Player({
  x,
  y,
  draggable,
  selected,
  onSelect,
  onDragEnd,
}) {
  const { theme } = useTheme();
  const fillColor = selected
    ? "#0f76a2"
    : theme === "light"
    ? "#2563eb"
    : "#556f8f";
  const strokeColor = selected
    ? "#1d4ed8"
    : theme === "light"
    ? "#1e40af"
    : "#0c4a6e";
  const lineColor = selected
    ? "#2a51bd"
    : theme === "light"
    ? "#404c72"
    : "#dbe0e3";

  return (
    <Group
      x={x}
      y={y}
      draggable={draggable}
      onMouseDown={onSelect}
      onDragEnd={onDragEnd}
    >
      <Circle
        radius={10}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={selected ? 4 : 2}
        y={-20}
      />
      <Line points={[0, -10, 0, 20]} stroke={lineColor} />
      <Rect width={40} height={10} y={20} offsetX={20} fill="blue" />
    </Group>
  );
}