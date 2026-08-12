import { useRef, useCallback, useState } from "react";

const catmullRom = (p0, p1, p2, p3, t) => {
  const v0 = (p2 - p0) * 0.5;
  const v1 = (p3 - p1) * 0.5;
  const t2 = t * t;
  const t3 = t2 * t;

  return (
    (2 * p1 - 2 * p2 + v0 + v1) * t3 +
    (-3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 +
    v0 * t +
    p1
  );
};

const smoothLine = (points) => {
  if (points.length < 4) return points;

  const smoothed = [];
  const segmentPoints = 5;

  for (let i = 0; i < points.length - 3; i += 2) {
    const p0x = points[i];
    const p0y = points[i + 1];
    const p1x = points[i + 2];
    const p1y = points[i + 3];
    const p2x = points[i + 4] ?? p1x;
    const p2y = points[i + 5] ?? p1y;
    const p3x = points[i + 6] ?? p2x;
    const p3y = points[i + 7] ?? p2y;

    for (let j = 0; j < segmentPoints; j++) {
      const t = j / segmentPoints;
      const x = catmullRom(p0x, p1x, p2x, p3x, t);
      const y = catmullRom(p0y, p1y, p2y, p3y, t);
      smoothed.push(x, y);
    }
  }

  smoothed.push(points[points.length - 2], points[points.length - 1]);
  return smoothed;
};

export default function useDrawing(screenToWorld, isDrawMode) {
  const [lines, setLines] = useState([]);
  const isDrawing = useRef(false);
  const currentLine = useRef(null);

  const handleMouseDown = useCallback(
    (e) => {
      if (!isDrawMode) return false;

      const stage = e.target.getStage();
      if (!stage) return false;

      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return false;

      const pos = screenToWorld({ x: pointerPos.x, y: pointerPos.y });
      isDrawing.current = true;
      currentLine.current = {
        x: pos.x,
        y: pos.y,
        points: [0, 0],
      };

      return true;
    },
    [isDrawMode, screenToWorld]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDrawMode || !isDrawing.current || !currentLine.current) return;

      const stage = e.target.getStage();
      if (!stage) return;

      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;

      const pos = screenToWorld({ x: pointerPos.x, y: pointerPos.y });
      const relX = pos.x - currentLine.current.x;
      const relY = pos.y - currentLine.current.y;

      currentLine.current.points.push(relX, relY);

      const smoothed = smoothLine(currentLine.current.points);
      setLines([
        {
          ...currentLine.current,
          points: smoothed,
        },
      ]);
    },
    [isDrawMode, screenToWorld]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing.current || !currentLine.current) return null;

    isDrawing.current = false;
    const finishedLine = {
      id: `line-${Date.now()}`,
      type: "line",
      x: currentLine.current.x,
      y: currentLine.current.y,
      points: smoothLine(currentLine.current.points),
    };

    currentLine.current = null;
    setLines([]);

    return finishedLine;
  }, []);

  const handleTouchStart = useCallback(
    (e) => {
      if (!isDrawMode) return false;

      const stage = e.target.getStage();
      if (!stage) return false;

      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return false;

      const pos = screenToWorld({ x: pointerPos.x, y: pointerPos.y });
      isDrawing.current = true;
      currentLine.current = {
        x: pos.x,
        y: pos.y,
        points: [0, 0],
      };

      return true;
    },
    [isDrawMode, screenToWorld]
  );

  const handleTouchMove = useCallback(
    (e) => {
      if (!isDrawMode || !isDrawing.current || !currentLine.current) return;

      const stage = e.target.getStage();
      if (!stage) return;

      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;

      const pos = screenToWorld({ x: pointerPos.x, y: pointerPos.y });
      const relX = pos.x - currentLine.current.x;
      const relY = pos.y - currentLine.current.y;

      currentLine.current.points.push(relX, relY);

      const smoothed = smoothLine(currentLine.current.points);
      setLines([
        {
          ...currentLine.current,
          points: smoothed,
        },
      ]);
    },
    [isDrawMode, screenToWorld]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDrawing.current || !currentLine.current) return null;

    isDrawing.current = false;
    const finishedLine = {
      id: `line-${Date.now()}`,
      type: "line",
      x: currentLine.current.x,
      y: currentLine.current.y,
      points: smoothLine(currentLine.current.points),
    };

    currentLine.current = null;
    setLines([]);

    return finishedLine;
  }, []);

  return {
    lines,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}