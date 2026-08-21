import React from 'react';
import { Group, Line, Text, Circle } from 'react-konva';

export default function BouncePad({ x, y, rotation = 0, length = 120, selected, draggable, onDragEnd, onSelect, onRotate, onScale }) {
  const half = length / 2;
  return (
    <Group
      x={x}
      y={y}
      rotation={rotation}
      draggable={draggable}
      onDragEnd={onDragEnd}
      onClick={() => onSelect && onSelect()}
      onTap={() => onSelect && onSelect()}
    >
      <Line points={[-half, 0, half, 0]} stroke={"#7c3aed"} strokeWidth={6} strokeCap={'round'} />
      <Text text={'BOUNCE'} fontSize={12} x={-half} y={-18} fill={'#a78bfa'} />
      {/* transform handles hidden to avoid accidental dragging; use sliders in object menu */}
    </Group>
  );
}
