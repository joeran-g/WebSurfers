import { Line as KonvaLine } from "react-konva";

export default function Line({ x = 0, y = 0, points, draggable, selected, onSelect, onDragEnd }) {
  return (
    <KonvaLine
      x={x}
      y={y}
      points={points}
      stroke={selected ? "#d30303" : "black"}
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