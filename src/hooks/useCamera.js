import { useCallback, useRef, useState } from "react";

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2;
const ZOOM_SPEED = 0.1;

export default function useCamera(initialCamera = { x: 0, y: 0, zoom: 1 }) {
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [camera, setCamera] = useState(initialCamera);
  const [isPanning, setIsPanning] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const startPan = useCallback((event) => {
    setIsPanning(true);
    lastPos.current = { x: event.clientX, y: event.clientY };
  }, []);

  const movePan = useCallback(
    (event) => {
      if (!isPanning) return;
      const dx = event.clientX - lastPos.current.x;
      const dy = event.clientY - lastPos.current.y;
      lastPos.current = { x: event.clientX, y: event.clientY };
      setCamera((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    },
    [isPanning]
  );

  const endPan = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleWheel = useCallback(
    (event) => {
      event.evt.preventDefault();
      const stage = event.target.getStage();
      if (!stage) return;

      const oldZoom = camera.zoom;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const direction = event.evt.deltaY > 0 ? -1 : 1;
      const factor = 1 + ZOOM_SPEED * direction;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom * factor));

      const mouseTo = {
        x: (pointer.x - camera.x) / oldZoom,
        y: (pointer.y - camera.y) / oldZoom,
      };

      setCamera({
        x: pointer.x - mouseTo.x * newZoom,
        y: pointer.y - mouseTo.y * newZoom,
        zoom: newZoom,
      });
    },
    [camera]
  );

  const screenToWorld = useCallback(
    ({ x, y }) => ({
      x: (x - camera.x) / camera.zoom,
      y: (y - camera.y) / camera.zoom,
    }),
    [camera]
  );

  const resetCamera = useCallback(
    (newCamera = initialCamera) => {
      setCamera(newCamera);
      setIsPanning(false);
    },
    [initialCamera]
  );

  return {
    stageSize,
    setStageSize,
    camera,
    setCamera,
    screenToWorld,
    handleWheel,
    startPan,
    movePan,
    endPan,
    isPanning,
    resetCamera,
  };
}