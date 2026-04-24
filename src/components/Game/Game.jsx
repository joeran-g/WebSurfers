import planck from "planck-js";
import confetti from "canvas-confetti";
import { Stage, Layer, Rect, Line, Group, Text } from "react-konva";
import { useState, useRef, useEffect } from "react";

import Player from "./objects/Player";
import Flag from "./objects/Flag";
import LineObj from "./objects/Line";
import useCamera from "../../hooks/useCamera";
import useDrawing from "../../hooks/useDrawing";
import usePhysics from "../../hooks/usePhysics";
import useObjects from "../../hooks/useObjects";

const WORLD_WIDTH = 4000;
const WORLD_HEIGHT = 2000;
const SCALE = 30;
const DEFAULT_WORLD = [
  { id: "player", type: "player", x: 70, y: 50 },
  { id: "flag", type: "flag", x: 750, y: 650 },
];

export default function Game() {
  const [physicsEnabled, setPhysicsEnabled] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [toolMenuOpen, setToolMenuOpen] = useState(false);
  const [, forceRender] = useState(0);

  const containerRef = useRef();

  const { stageSize, setStageSize, camera, setCamera, screenToWorld, handleWheel, startPan, movePan, endPan, isPanning } = useCamera();
  const drawing = useDrawing(screenToWorld);
  const { objects, setObjects, selectedId, setSelectedId, draftPositions, setDraftPositions, handleObjectDragEnd, handleLineDragEnd, saveSelectedPosition, deleteSelectedObject, canDeleteSelectedObject, isSelectedMoveSaved } = useObjects(DEFAULT_WORLD);
  const { buildWorld, worldRef, playerBody } = usePhysics(objects, physicsEnabled, stageSize, camera, setCamera, setHasWon, hasWon, forceRender);

  function startGame() {
    buildWorld();
    setHasWon(false);
    setPhysicsEnabled(true);
  }

  function stopGame() {
    setCamera({ x: 0, y: 0, zoom: 1 });
    setPhysicsEnabled(false);
    setHasWon(false);
    worldRef.current = null;
    setDraftPositions({});
    setSelectedId(null);
  }

  function handleMouseDown(e) {
    if (physicsEnabled) return;
    if (drawing.handleMouseDown(e)) return;
    const stage = e.target.getStage();
    if (e.target === stage) {
      setSelectedId(null);
      if (!selectedId) startPan(e);
      return;
    }
    if (!selectedId) startPan(e);
  }

  function handleMouseMove(e) {
    if (physicsEnabled) return;
    if (drawing.handleMouseMove(e)) return;
    if (isPanning.current) movePan(e);
  }

  function handleMouseUp() {
    if (physicsEnabled) return;
    const newLine = drawing.handleMouseUp();
    if (newLine) {
      setObjects((prev) => [...prev, { id: "line-" + Date.now(), type: "line", points: newLine.points }]);
    }
    endPan();
  }

  useEffect(() => {
    const resize = () => {
      const w = containerRef.current?.offsetWidth ?? window.innerWidth;
      const h = containerRef.current?.offsetHeight ?? window.innerHeight;
      setStageSize({ width: w, height: h });
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [setStageSize]);

  const selectedObject = selectedId ? objects.find((obj) => obj.id === selectedId) : null;

  function toPixels(value) {
    return value * SCALE;
  }

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <Stage width={stageSize.width} height={stageSize.height} onWheel={(e) => !physicsEnabled && handleWheel(e)} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
        <Layer x={camera.x} y={camera.y} scaleX={camera.zoom} scaleY={camera.zoom}>
          <Rect width={WORLD_WIDTH} height={WORLD_HEIGHT} fill="#5f6782" listening={false} />
          {drawing.lines.map((line, index) => <Line key={`preview-${index}`} points={line.points} stroke="white" strokeWidth={4} lineCap="round" lineJoin="round" />)}
          {objects.map((obj) => {
            const draft = draftPositions[obj.id];
            const position = draft?.x !== undefined ? { x: draft.x, y: draft.y } : { x: obj.x, y: obj.y };
            const points = draft?.points || obj.points;

            if (obj.type === "player") {
              const physicsPos = physicsEnabled && playerBody.current ? playerBody.current.getPosition() : null;
              const x = physicsPos ? toPixels(physicsPos.x) : position.x;
              const y = physicsPos ? toPixels(physicsPos.y) : position.y;

              return (
                <Player
                  key={obj.id}
                  x={x}
                  y={y}
                  draggable={!physicsEnabled}
                  onSelect={() => setSelectedId(obj.id)}
                  onDragEnd={(e) => handleObjectDragEnd(obj.id, e)}
                />
              );
            }

            if (obj.type === "flag") {
              return (
                <Flag
                  key={obj.id}
                  x={position.x}
                  y={position.y}
                  draggable={!physicsEnabled}
                  onSelect={() => setSelectedId(obj.id)}
                  onDragEnd={(e) => handleObjectDragEnd(obj.id, e)}
                />
              );
            }

            if (obj.type === "line") {
              return (
                <LineObj
                  key={obj.id}
                  points={points}
                  draggable={!physicsEnabled}
                  selected={selectedId === obj.id}
                  onSelect={() => setSelectedId(obj.id)}
                  onDragEnd={(e) => handleLineDragEnd(obj.id, e)}
                />
              );
            }

            return null;
          })}
        </Layer>

        <Layer>
          <Text text="Menu" x={10} y={10} fill="white" onClick={() => setToolMenuOpen((prev) => !prev)} />
          {toolMenuOpen && (
            <>
              <Text text="Draw Line" x={10} y={40} fill="white" onClick={drawing.enableDrawing} />
              <Text text="Start" x={10} y={70} fill="#51cf66" onClick={startGame} />
              <Text text="Stop" x={10} y={100} fill="#ff6b6b" onClick={stopGame} />
            </>
          )}
        </Layer>

        {!physicsEnabled && selectedObject && (
          <Layer>
            <Group x={stageSize.width - 180} y={20}>
              <Rect width={170} height={110} fill="rgba(40,40,40,0.95)" stroke="white" strokeWidth={2} cornerRadius={8} />
              <Text text={`Selected: ${selectedObject.type}`} x={10} y={12} fontSize={14} fill="white" />
              <Text text={isSelectedMoveSaved() ? "Save new position" : "Move object to reposition"} x={10} y={35} fontSize={12} fill="#c9c9c9" />
              <Text text="Save Position" x={10} y={55} fontSize={14} fill={isSelectedMoveSaved() ? "#51cf66" : "#777"} onClick={saveSelectedPosition} />
              <Line points={[10, 80, 160, 80]} stroke="white" strokeWidth={1} />
              <Text text="Delete Object" x={10} y={90} fontSize={14} fill={canDeleteSelectedObject() ? "#ff6b6b" : "#777"} onClick={canDeleteSelectedObject() ? deleteSelectedObject : undefined} />
            </Group>
          </Layer>
        )}

        {physicsEnabled && (
          <Layer>
            <Text text="Controls: A/D or ←/→ to move, Space to jump" x={10} y={stageSize.height - 30} fill="white" fontSize={16} />
          </Layer>
        )}

        {hasWon && (
          <Layer>
            <Rect x={0} y={0} width={stageSize.width} height={stageSize.height} fill="rgba(0,0,0,0.6)" />
            <Text text="🎉 YOU WIN! 🎉" x={stageSize.width / 2} y={stageSize.height / 2} fontSize={48} fill="white" align="center" offsetX={120} offsetY={24} />
            <Text text="Click to continue" x={stageSize.width / 2} y={stageSize.height / 2 + 80} fontSize={20} fill="white" align="center" offsetX={70} onClick={stopGame} />
          </Layer>
        )}
      </Stage>
    </div>
  );
}