import React from 'react';
import { Group, Rect, Arrow, Text, Circle } from 'react-konva';

export default function Boost({ x, y, rotation = 0, width = 120, height = 40, selected, draggable, onDragEnd, onSelect, onRotate, onScale }) {
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
      <Rect x={-width/2} y={-height/2} width={width} height={height} fill={'rgba(96,165,250,0.18)'} stroke={'#60a5fa'} strokeWidth={selected ? 2 : 1} cornerRadius={6} />
      <Arrow points={[-width/4, 0, width/4, 0]} pointerLength={8} pointerWidth={8} fill={'#60a5fa'} stroke={'#60a5fa'} strokeWidth={2} />
      <Text text={''} fontSize={12} x={-width/2 + 6} y={-height/2 + 4} fill={'#0ea5e9'} />
    </Group>
  );
}
