import { Line as KonvaLine } from "react-konva";
import { useTheme } from "../../../context/ThemeContext";

export default function Line({
  x = 0,
  y = 0,
  points,
  draggable,
  selected,
  onSelect,
  onDragEnd,
  stroke,
}) {
  const { theme } = useTheme();
  const defaultColor = selected ? "#2f8082" : theme === "light" ? "black" : "#ccc";
  const color = stroke || defaultColor;

  return (
    <KonvaLine
      x={x}
      y={y}
      points={points}
      stroke={color}
      strokeWidth={4}
      hitStrokeWidth={20}
      draggable={draggable}
      onMouseDown={onSelect}
      onDragEnd={onDragEnd}
      lineCap="round"
      lineJoin="round"
    />
  );
}