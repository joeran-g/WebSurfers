import { Group, Circle, Line, Rect } from "react-konva";

export default function Player({ x, y, draggable, onSelect }) {
  return (
    <Group x={x} y={y} draggable={draggable} onMouseDown={onSelect}>
      <Circle radius={10} fill="white" y={-20} />
      <Line points={[0, -10, 0, 20]} stroke="white" />
      <Rect width={40} height={10} y={20} offsetX={20} fill="blue" />
    </Group>
  );
}