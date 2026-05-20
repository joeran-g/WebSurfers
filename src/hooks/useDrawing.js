import { useCallback, useRef, useState } from "react";

export default function useDrawing(screenToWorld, isDrawingMode) {
  const [lines, setLines] = useState([]);
  const isDrawing = useRef(false);
  const currentLine = useRef(null);

  const handleMouseDown = useCallback(
    (event) => {
      if (!isDrawingMode) return false;

      const stage = event.target.getStage();
      if (!stage) return false;

      const pointer = stage.getPointerPosition();
      if (!pointer) return false;

      const position = screenToWorld(pointer);
      isDrawing.current = true;
      currentLine.current = {
        id: `line-${Date.now()}`,
        type: "line",
        x: position.x,
        y: position.y,
        points: [0, 0],
      };
      setLines([currentLine.current]);
      return true;
    },
    [screenToWorld, isDrawingMode]
  );

  const handleMouseMove = useCallback(
    (event) => {
      if (!isDrawing.current || !currentLine.current) return false;

      const stage = event.target.getStage();
      if (!stage) return false;

      const pointer = stage.getPointerPosition();
      if (!pointer) return false;

      const position = screenToWorld(pointer);
      const dx = position.x - currentLine.current.x;
      const dy = position.y - currentLine.current.y;

      currentLine.current = {
        ...currentLine.current,
        points: [...currentLine.current.points, dx, dy],
      };
      setLines([currentLine.current]);
      return true;
    },
    [screenToWorld]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing.current || !currentLine.current) {
      setLines([]);
      return null;
    }

    isDrawing.current = false;
    const finishedLine = currentLine.current;
    currentLine.current = null;
    setLines([]);

    if (finishedLine.points.length < 4) return null;
    return finishedLine;
  }, []);

  return {
    lines,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}