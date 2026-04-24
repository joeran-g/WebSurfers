import { useCallback, useRef, useState } from "react";

export default function useDrawing(screenToWorld) {
  const [lines, setLines] = useState([]);
  const isDrawing = useRef(false);
  const drawEnabled = useRef(false);
  const currentLine = useRef(null);

  const enableDrawing = useCallback(() => {
    drawEnabled.current = true;
  }, []);

  const handleMouseDown = useCallback(
    (e) => {
      const stage = e.target.getStage();
      if (!drawEnabled.current || e.target !== stage) return false;

      const pointer = stage.getPointerPosition();
      if (!pointer) return false;

      const pos = screenToWorld(pointer.x, pointer.y);

      isDrawing.current = true;
      currentLine.current = { points: [pos.x, pos.y] };
      setLines([currentLine.current]);

      return true;
    },
    [screenToWorld]
  );

  const handleMouseMove = useCallback( //Throttle this in the future
    (e) => {
      if (!isDrawing.current || !currentLine.current) return false;

      const stage = e.target.getStage();
      const pointer = stage.getPointerPosition();
      if (!pointer) return false;

      const pos = screenToWorld(pointer.x, pointer.y);

      currentLine.current = {
        ...currentLine.current,
        points: [...currentLine.current.points, pos.x, pos.y],
      };
      setLines([currentLine.current]);

      return true;
    },
    [screenToWorld]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing.current) return null;

    isDrawing.current = false;
    drawEnabled.current = false;

    const line = currentLine.current;
    currentLine.current = null;
    setLines([]);

    if (line && line.points.length >= 4) {
      return line;
    }

    return null;
  }, []);

  return {
    lines,
    enableDrawing,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}