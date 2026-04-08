import { Line as KonvaLine } from "react-konva";

export default function Line({ points, draggable, selected, onSelect }) {
  return (
    <KonvaLine
      points={points}
      stroke={selected ? "#d30303" : "black"}
      strokeWidth={4}
      draggable={draggable}
      onMouseDown={onSelect}
      lineCap="round"
      lineJoin="round"
    />
  );
}