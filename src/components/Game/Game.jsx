import planck from "planck-js";
import confetti from "canvas-confetti";
import { Stage, Layer, Rect, Line, Group, Text } from "react-konva";
import { useState, useRef, useEffect } from "react";

import { createWorld } from "./physics/World";
import Player from "./objects/Player";
import Flag from "./objects/Flag";
import LineObj from "./objects/Line";
import useCamera from "../../hooks/useCamera";
import useDrawing from "../../hooks/useDrawing";

const WORLD_WIDTH = 4000;
const WORLD_HEIGHT = 2000;

const SCALE = 30; // pixels per meter
const FLAG_RADIUS = 50; // in pixels

export default function Game() {
  function toWorld(x) {
    return x / SCALE;
  }

  function toPixels(x) {
    return x * SCALE;
  }

  const containerRef = useRef();

  // ===== STATE =====
  const [objects, setObjects] = useState([
    { id: "player", type: "player", x: 70, y: 50 },
    { id: "flag", type: "flag", x: 750, y: 650 },
  ]);
  const [physicsEnabled, setPhysicsEnabled] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [toolMenuOpen, setToolMenuOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [draftPositions, setDraftPositions] = useState({});

  // ===== REFS =====
  const worldRef = useRef(null);
  const playerBody = useRef(null);
  const playerOnGround = useRef(false);

  const [, forceRender] = useState(0);

  const {
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
  } = useCamera();

  const drawing = useDrawing(screenToWorld);

  // ===== BUILD PHYSICS =====
  function buildWorld() {
    const world = createWorld();

    objects.forEach((obj) => {
      if (obj.type === "player") {
        const body = world.createBody({
          type: "dynamic",
          position: planck.Vec2(toWorld(obj.x), toWorld(obj.y)),
        });

        body.createFixture(planck.Circle(toWorld(10)), {
          density: 50,
          friction: 0.1,
        });

        playerBody.current = body;
      }

      if (obj.type === "line") {
        const body = world.createBody();

        for (let i = 0; i < obj.points.length - 2; i += 2) {
          const v1 = planck.Vec2(
            toWorld(obj.points[i]),
            toWorld(obj.points[i + 1])
          );
          const v2 = planck.Vec2(
            toWorld(obj.points[i + 2]),
            toWorld(obj.points[i + 3])
          );

          body.createFixture(planck.Edge(v1, v2), {
            friction: 0.2,
          });
        }
      }
    });

    world.on("begin-contact", (c) => {
      const a = c.getFixtureA().getBody();
      const b = c.getFixtureB().getBody();

      if (a === playerBody.current || b === playerBody.current) {
        playerOnGround.current = true;
      }
    });

    world.on("end-contact", (c) => {
      const a = c.getFixtureA().getBody();
      const b = c.getFixtureB().getBody();

      if (a === playerBody.current || b === playerBody.current) {
        playerOnGround.current = false;
      }
    });

    worldRef.current = world;
  }

  // ===== PHYSICS LOOP =====
  useEffect(() => {
    if (!physicsEnabled) return;

    let frame;

    function update() {
      worldRef.current.step(1 / 60);

      const pos = playerBody.current?.getPosition();

      if (pos) {
        setCamera((prev) => ({
          ...prev,
          x: stageSize.width / 2 - toPixels(pos.x) * prev.zoom,
          y: stageSize.height / 2 - toPixels(pos.y) * prev.zoom,
        }));

        const flag = objects.find((o) => o.type === "flag");

        if (flag) {
          const flagWorldX = toWorld(flag.x);
          const flagWorldY = toWorld(flag.y);

          const dist = Math.hypot(pos.x - flagWorldX, pos.y - flagWorldY);

          if (dist < toWorld(FLAG_RADIUS) && !hasWon) {
            setHasWon(true);
            confetti();
          }
        }
      }

      forceRender((t) => t + 1);
      frame = requestAnimationFrame(update);
    }

    update();
    return () => cancelAnimationFrame(frame);
  }, [physicsEnabled, objects, hasWon, stageSize.width, stageSize.height, setCamera]);

  // ===== CONTROLS =====
  useEffect(() => {
    function handleKey(e) {
      if (!physicsEnabled) return;

      if (e.code === "Space" && playerOnGround.current) {
        playerBody.current.applyLinearImpulse(
          planck.Vec2(0, -5),
          playerBody.current.getWorldCenter()
        );
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [physicsEnabled]);

  // ===== INTERACTION =====
  function handleMouseDown(e) {
    if (physicsEnabled) return;

    if (drawing.handleMouseDown(e)) return;

    const stage = e.target.getStage();
    if (e.target === stage) {
      setSelectedId(null);
      if (!selectedId) {
        startPan(e);
      }
      return;
    }

    if (!selectedId) {
      startPan(e);
    }
  }

  function handleMouseMove(e) {
    if (physicsEnabled) return;

    if (drawing.handleMouseMove(e)) return;
    if (isPanning.current) {
      movePan(e);
    }
  }

  function handleMouseUp() {
    if (physicsEnabled) return;

    const newLine = drawing.handleMouseUp();
    if (newLine) {
      setObjects((prev) => [
        ...prev,
        {
          id: "line-" + Date.now(),
          type: "line",
          points: newLine.points,
        },
      ]);
    }

    endPan();
  }

  function handleObjectDragEnd(id, e) {
    if (physicsEnabled) return;

    const { x, y } = e.target.position();
    setDraftPositions((prev) => ({
      ...prev,
      [id]: { x, y },
    }));
    setSelectedId(id);
  }

  function handleLineDragEnd(id, e) {
    if (physicsEnabled) return;

    const offsetX = e.target.x();
    const offsetY = e.target.y();

    setDraftPositions((prev) => ({
      ...prev,
      [id]: {
        points: (objects.find((obj) => obj.id === id)?.points || []).map(
          (value, index) => (index % 2 === 0 ? value + offsetX : value + offsetY)
        ),
      },
    }));

    e.target.position({ x: 0, y: 0 });
    setSelectedId(id);
  }

  function saveSelectedPosition() {
    if (!selectedId) return;

    const draft = draftPositions[selectedId];
    if (!draft) return;

    setObjects((prev) =>
      prev.map((obj) => {
        if (obj.id !== selectedId) return obj;
        if (draft.points) return { ...obj, points: draft.points };
        return { ...obj, x: draft.x, y: draft.y };
      })
    );

    setDraftPositions((prev) => {
      const next = { ...prev };
      delete next[selectedId];
      return next;
    });
  }

  function deleteSelectedObject() {
    if (!selectedId) return;

    const obj = objects.find((o) => o.id === selectedId);
    if (!obj) return;

    const sameTypeCount = objects.filter((o) => o.type === obj.type).length;
    if (
      (obj.type === "player" || obj.type === "flag") &&
      sameTypeCount <= 1
    ) {
      return;
    }

    setObjects((prev) => prev.filter((o) => o.id !== selectedId));
    setDraftPositions((prev) => {
      const next = { ...prev };
      delete next[selectedId];
      return next;
    });
    setSelectedId(null);
  }

  function canDeleteSelectedObject() {
    if (!selectedId) return false;

    const obj = objects.find((o) => o.id === selectedId);
    if (!obj) return false;

    const sameTypeCount = objects.filter((o) => o.type === obj.type).length;
    return obj.type === "line" || sameTypeCount > 1;
  }

  function isSelectedMoveSaved() {
    return selectedId != null && !!draftPositions[selectedId];
  }

  // ===== RESIZE =====
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

  // ===== GAME CONTROL =====
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
    playerBody.current = null;
    setDraftPositions({});
    setSelectedId(null);
  }

  const selectedObject = selectedId
    ? objects.find((obj) => obj.id === selectedId)
    : null;

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        onWheel={(e) => {
          if (!physicsEnabled) handleWheel(e);
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <Layer
          x={camera.x}
          y={camera.y}
          scaleX={camera.zoom}
          scaleY={camera.zoom}
        >
          <Rect
            width={WORLD_WIDTH}
            height={WORLD_HEIGHT}
            fill="#5f6782"
            listening={false}
          />

          {drawing.lines.map((line, index) => (
            <Line
              key={`preview-${index}`}
              points={line.points}
              stroke="white"
              strokeWidth={4}
              lineCap="round"
              lineJoin="round"
            />
          ))}

          {objects.map((obj) => {
            const draft = draftPositions[obj.id];
            const position = draft?.x !== undefined ? { x: draft.x, y: draft.y } : { x: obj.x, y: obj.y };
            const points = draft?.points || obj.points;

            if (obj.type === "player") {
              const pos = playerBody.current?.getPosition();
              const x = physicsEnabled && pos ? toPixels(pos.x) : position.x;
              const y = physicsEnabled && pos ? toPixels(pos.y) : position.y;
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
          <Text
            text="Menu"
            type="button"
            x={10}
            y={10}
            fill="white"
            onClick={() => setToolMenuOpen((prev) => !prev)}
          />
          {toolMenuOpen ? (
            <>
              <Text
                text="Draw Line"
                x={10}
                y={40}
                fill="white"
                onClick={drawing.enableDrawing}
              />

              <Text
                text="Start"
                x={10}
                y={70}
                fill="#51cf66"
                onClick={startGame}
              />

              <Text
                text="Stop"
                x={10}
                y={100}
                fill="#ff6b6b"
                onClick={stopGame}
              />

              <Text text="Space = Jump" x={10} y={140} fill="white" />
            </>
          ) : null}
        </Layer>

        {!physicsEnabled && selectedObject && (
          <Layer>
            <Group x={stageSize.width - 180} y={20}>
              <Rect
                width={170}
                height={110}
                fill="rgba(40, 40, 40, 0.95)"
                stroke="white"
                strokeWidth={2}
                cornerRadius={8}
              />
              <Text
                text={`Selected: ${selectedObject.type}`}
                x={10}
                y={12}
                fontSize={14}
                fill="white"
              />
              <Text
                text={
                  isSelectedMoveSaved()
                    ? "Save new position"
                    : "Move object to reposition"
                }
                x={10}
                y={35}
                fontSize={12}
                fill="#c9c9c9"
              />
              <Text
                text="Save Position"
                x={10}
                y={55}
                fontSize={14}
                fill={isSelectedMoveSaved() ? "#51cf66" : "#777"}
                onClick={saveSelectedPosition}
              />
              <Line points={[10, 80, 160, 80]} stroke="white" strokeWidth={1} />
              <Text
                text="Delete Object"
                x={10}
                y={90}
                fontSize={14}
                fill={canDeleteSelectedObject() ? "#ff6b6b" : "#777"}
                onClick={
                  canDeleteSelectedObject() ? deleteSelectedObject : undefined
                }
              />
            </Group>
          </Layer>
        )}

        {hasWon && (
          <Layer>
            <Rect
              x={0}
              y={0}
              width={stageSize.width}
              height={stageSize.height}
              fill="rgba(0,0,0,0.6)"
            />
            <Text
              text="🎉 YOU WIN! 🎉"
              x={stageSize.width / 2}
              y={stageSize.height / 2}
              fontSize={48}
              fill="white"
              align="center"
              offsetX={120}
              offsetY={24}
            />
            <Text
              text="Click to continue"
              x={stageSize.width / 2}
              y={stageSize.height / 2 + 80}
              fontSize={20}
              fill="white"
              align="center"
              offsetX={70}
              onClick={stopGame}
            />
          </Layer>
        )}
      </Stage>
    </div>
  );
}