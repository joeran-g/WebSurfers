import { useCallback, useRef, useState } from "react";

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2;
const ZOOM_SPEED = 0.1;

export default function useCamera(
  initialSize = { width: window.innerWidth, height: window.innerHeight }
) {
  const [stageSize, setStageSize] = useState(initialSize);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });

  const isPanning = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });

  const screenToWorld = useCallback(
    (x, y) => ({
      x: (x - camera.x) / camera.zoom,
      y: (y - camera.y) / camera.zoom,
    }),
    [camera]
  );

  const handleWheel = useCallback(
    (e) => {
      e.evt.preventDefault();

      const delta = e.evt.deltaY > 0 ? -ZOOM_SPEED : ZOOM_SPEED;
      const zoom = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, camera.zoom + delta)
      );

      setCamera((prev) => ({
        ...prev,
        zoom,
      }));
    },
    [camera.zoom]
  );

  function startPan(e) {
    isPanning.current = true;
    lastPan.current = { x: e.evt.clientX, y: e.evt.clientY };
  }

  function movePan(e) {
    if (!isPanning.current) return;

    const dx = e.evt.clientX - lastPan.current.x;
    const dy = e.evt.clientY - lastPan.current.y;

    setCamera((prev) => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy,
    }));

    lastPan.current = { x: e.evt.clientX, y: e.evt.clientY };
  }

  function endPan() {
    isPanning.current = false;
  }

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
  };
}