import { Group, Rect } from "react-konva";

export default function Flag({ x, y, draggable, onSelect }) {
  return (
    <Group x={x} y={y} draggable={draggable} onMouseDown={onSelect}>
      <Rect width={5} height={40} fill="white" />
      <Rect width={20} height={15} x={5} fill="red" />
    </Group>
  );
}