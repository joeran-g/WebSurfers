import confetti from "canvas-confetti";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Group } from "react-konva";

import Player from "./objects/Player";
import Flag from "./objects/Flag";
import LineObj from "./objects/Line";
import useCamera from "../../hooks/useCamera";
import useDrawing from "../../hooks/useDrawing";
import usePhysics from "../../hooks/usePhysics";
import useObjects from "../../hooks/useObjects";
import useApi from "../../hooks/useApi";
import "../../styles/Game.css";
import { useTheme } from "../../context/ThemeContext";

const DEFAULT_WORLD = [
  { id: "player", type: "player", x: 70, y: 50 },
  { id: "flag", type: "flag", x: 750, y: 650 },
];

const DEFAULT_CAMERA = { x: 0, y: 0, zoom: 1 };

function Game(props, ref) {
  const [physicsEnabled, setPhysicsEnabled] = useState(false);
  const [toolMode, setToolMode] = useState(null);
  const [objectMenuPos, setObjectMenuPos] = useState(null);
  const [, forceRender] = useState(0);
  const [gameResult, setGameResult] = useState(null); // null | "win" | "lose"

  const containerRef = useRef();
  const runStartState = useRef(null);

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
    resetCamera,
  } = useCamera(DEFAULT_CAMERA);
  const drawing = useDrawing(
    screenToWorld,
    toolMode === "draw" || toolMode === "draw-obstacle"
  );
  const {
    objects,
    setObjects,
    selectedId,
    selectedObject,
    setSelectedId,
    handleObjectDragEnd,
    handleLineDragEnd,
    deleteSelectedObject,
    canDeleteSelectedObject,
    saveSelectedObjectPosition,
    clearPendingPosition,
  } = useObjects(DEFAULT_WORLD);

  const { buildWorld, playerBody } = usePhysics(
    objects,
    physicsEnabled,
    stageSize,
    setCamera,
    forceRender,
    setGameResult,
    gameResult
  );
  const { getWorlds } = useApi();
  const { theme } = useTheme();

  useEffect(() => {
    const loadPublicWorlds = async () => {
      const worlds = await getWorlds();
      if (!worlds?.length) return;
      const weekly = worlds.find((world) => world.is_weekly_world);
      const selected = weekly || worlds[0];
      if (selected?.world_data) {
        setObjects(selected.world_data);
      }
    };
    loadPublicWorlds();
  }, [getWorlds, setObjects]);

    useEffect(() => {
    if (gameResult !== "win") return undefined;

    const burst = () => {
      confetti({
        particleCount: 90,
        spread: 90,
        startVelocity: 40,
        origin: { x: 0.5 , y: 0.5 },
      });
    };

    burst();
    const interval = setInterval(burst, 300);
    const timeout = setTimeout(() => clearInterval(interval), 1200);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [gameResult]);

  useEffect(() => {
    const resize = () => {
      const width = containerRef.current?.offsetWidth ?? window.innerWidth;
      const height = containerRef.current?.offsetHeight ?? window.innerHeight;
      setStageSize({ width, height });
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [setStageSize]);

  useEffect(() => {
    if (!selectedId) {
      setObjectMenuPos(null);
      return;
    }

    const obj = selectedObject || objects.find((item) => item.id === selectedId);
    if (!obj) return;

    setObjectMenuPos({
      x: obj.x * camera.zoom + camera.x,
      y: obj.y * camera.zoom + camera.y + 40,
    });
  }, [selectedId, selectedObject, objects, camera]);

  useEffect(() => {
    if (toolMode !== "select") {
      setSelectedId(null);
      setObjectMenuPos(null);
    }
  }, [toolMode, setSelectedId]);

  const resetRun = useCallback(() => {
    setPhysicsEnabled(false);
    setGameResult(null);
    if (runStartState.current) {
      setObjects(JSON.parse(JSON.stringify(runStartState.current)));
    }
    resetCamera(DEFAULT_CAMERA);
  }, [setObjects, resetCamera]);

  useEffect(() => {
    if (gameResult === "win" && physicsEnabled) {
      setPhysicsEnabled(false);
    }
  }, [gameResult, physicsEnabled]);

  const startGame = () => {
    runStartState.current = JSON.parse(JSON.stringify(objects));
    setSelectedId(null);
    setObjectMenuPos(null);
    setGameResult(null);
    setPhysicsEnabled(true);
    resetCamera(DEFAULT_CAMERA);
    buildWorld();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "KeyR" && physicsEnabled) {
        e.preventDefault();
        resetRun();
      }

      if (e.code === "Space" && !physicsEnabled && !gameResult) {
        e.preventDefault();
        startGame();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [physicsEnabled, resetRun, startGame, gameResult]);

  useEffect(() => {
    if (!gameResult) return;

    const handleContinue = () => {
      setPhysicsEnabled(false);
      setGameResult(null);
      if (runStartState.current) {
        setObjects(JSON.parse(JSON.stringify(runStartState.current)));
      }
      resetCamera(DEFAULT_CAMERA);
    };

    const handleAny = (event) => {
      event.preventDefault();
      handleContinue();
    };

    window.addEventListener("keydown", handleAny);
    window.addEventListener("mousedown", handleAny);
    return () => {
      window.removeEventListener("keydown", handleAny);
      window.removeEventListener("mousedown", handleAny);
    };
  }, [gameResult, resetCamera, setObjects]);

  const stopGame = () => {
    setPhysicsEnabled(false);
    setGameResult(null);
    setSelectedId(null);
    setObjectMenuPos(null);
    resetCamera(DEFAULT_CAMERA);
  };

  const handleMouseDown = (e) => {
    const stage = e.target.getStage();
    if (!stage) return;

    const clickedOnStageBackground =
      e.target === stage || e.target.name() === "background";
    const isDrawMode = toolMode === "draw" || toolMode === "draw-obstacle";

    if (physicsEnabled || gameResult) {
      return;
    }

    if (isDrawMode) {
      if (drawing.handleMouseDown(e)) return;
      if (clickedOnStageBackground) setSelectedId(null);
      return;
    }

    if (toolMode === "select") {
      if (clickedOnStageBackground) {
        setSelectedId(null);
        setObjectMenuPos(null);
      }
      return;
    }

    if (clickedOnStageBackground && e.evt.button === 0) {
      startPan(e.evt);
      return;
    }

    if (clickedOnStageBackground) {
      setSelectedId(null);
      setObjectMenuPos(null);
    }
  };

  const handleMouseMove = (e) => {
    const isDrawMode = toolMode === "draw" || toolMode === "draw-obstacle";
    if (isDrawMode) {
      drawing.handleMouseMove(e);
      return;
    }
    if (isPanning) {
      movePan(e.evt);
    }
  };

  const handleMouseUp = () => {
    const isDrawMode = toolMode === "draw" || toolMode === "draw-obstacle";
    if (isDrawMode) {
      const finishedLine = drawing.handleMouseUp();
      if (finishedLine) {
        if (toolMode === "draw-obstacle") {
          finishedLine.type = "obstacle";
        }
        setObjects((prev) => [...prev, finishedLine]);
      }
      return;
    }

    if (isPanning) {
      endPan();
    }
  };

  const renderObject = (obj) => {
    const renderObj = obj.id === selectedId && selectedObject ? selectedObject : obj;
    const isPlayer = renderObj.type === "player";
    const playerPos =
      isPlayer && physicsEnabled && playerBody.current
        ? playerBody.current.getPosition()
        : null;

    const x = playerPos ? playerPos.x * 30 : renderObj.x ?? 0;
    const y = playerPos ? playerPos.y * 30 : renderObj.y ?? 0;

    const props = {
      x,
      y,
      draggable: toolMode === "select",
      selected: selectedId === renderObj.id && toolMode === "select",
      onSelect: () => {
        if (toolMode === "select") {
          setSelectedId(renderObj.id);
        }
      },
      onDragEnd: (event) => {
        if (renderObj.type === "line" || renderObj.type === "obstacle") {
          handleLineDragEnd(renderObj.id, event);
        } else {
          handleObjectDragEnd(renderObj.id, event);
        }
      },
    };

    if (renderObj.type === "player") return <Player key={renderObj.id} {...props} />;
    if (renderObj.type === "flag") return <Flag key={renderObj.id} {...props} />;
    if (renderObj.type === "line")
      return (
        <LineObj
          key={renderObj.id}
          {...props}
          points={renderObj.points}
          stroke={theme === "light" ? "black" : "#ccc"}
        />
      );
    if (renderObj.type === "obstacle")
      return <LineObj key={renderObj.id} {...props} points={renderObj.points} stroke="red" />;
    return null;
  };

  const getCanvasBg = () => {
    return theme === "light" ? "#e0f2fe" : "#1a1f2e";
  };

  return (
    <div className="game">
      <div ref={containerRef} className="game__canvas-wrapper">
        <Stage
          width={stageSize.width}
          height={stageSize.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          style={{
            cursor: isPanning ? "grabbing" : toolMode === "draw" || toolMode === "draw-obstacle" ? "crosshair" : "default",
          }}
        >
          <Layer>
            <Rect
              name="background"
              x={0}
              y={0}
              width={stageSize.width}
              height={stageSize.height}
              fill={getCanvasBg()}
            />
            <Group x={camera.x} y={camera.y} scaleX={camera.zoom} scaleY={camera.zoom}>
              {objects.map(renderObject)}
              {drawing.lines[0] && (
                <LineObj
                  key="draft-line"
                  x={drawing.lines[0].x}
                  y={drawing.lines[0].y}
                  points={drawing.lines[0].points}
                  stroke={toolMode === "draw-obstacle" ? "red" : theme === "light" ? "black" : "#ccc"}
                />
              )}
            </Group>
          </Layer>
        </Stage>

        <div className="game__controls">
          <button onClick={startGame} disabled={physicsEnabled || !!gameResult}>
            Start Game
          </button>
          <button onClick={stopGame} disabled={!physicsEnabled}>
            Stop Game
          </button>
          <button onClick={resetRun} disabled={!physicsEnabled && !gameResult}>
            Reset Run
          </button>
        </div>

        <div className="tool-menu">
          {!toolMode ? (
            <>
              <button onClick={() => setToolMode("draw")}>Draw Line</button>
              <button onClick={() => setToolMode("draw-obstacle")}>Draw Obstacle</button>
              <button onClick={() => setToolMode("select")}>Move/Delete Object</button>
            </>
          ) : (
            <>
              <button onClick={() => setToolMode(null)}>Back</button>
              <div style={{ color: "#ccc", fontSize: "12px", marginTop: "4px" }}>
                {toolMode === "draw"
                  ? "Click and drag to draw a line."
                  : toolMode === "draw-obstacle"
                  ? "Click and drag to draw a red obstacle."
                  : "Click an object to select it."}
              </div>
            </>
          )}
        </div>

        {toolMode === "select" && selectedId && objectMenuPos && (
          <div className="object-menu" style={{ top: objectMenuPos.y, left: objectMenuPos.x }}>
            <button
              onClick={() => {
                saveSelectedObjectPosition();
                setSelectedId(null);
                setObjectMenuPos(null);
              }}
            >
              Save position
            </button>
            <button
              onClick={() => {
                clearPendingPosition();
                setSelectedId(null);
                setObjectMenuPos(null);
              }}
            >
              Cancel
            </button>
            {canDeleteSelectedObject() && (
              <button
                onClick={() => {
                  deleteSelectedObject();
                  setSelectedId(null);
                  setObjectMenuPos(null);
                }}
              >
                Delete
              </button>
            )}
          </div>
        )}

        {physicsEnabled && !gameResult && (
          <div className="game__status">Physics enabled — arrow left/right to move, space to jump</div>
        )}

        {gameResult && (
          <div className="game__end-overlay">
            <div className="game__end-card">
              <div className="game__end-title">
                {gameResult === "win" ? "You Won!" : "You Died!"}
              </div>
              <div className="game__end-body">
                {gameResult === "win" ? (
                  <>
                    <div className="game__confetti">🎉 🎉 🎉</div>
                    <p>Reached the flag — nice run!</p>
                  </>
                ) : (
                  <>
                    <div className="game__boom"></div>
                    <p>Better luck next time!</p>
                  </>
                )}
              </div>
              <button
                onClick={() => {
                  setPhysicsEnabled(false);
                  setGameResult(null);
                  if (runStartState.current) {
                    setObjects(JSON.parse(JSON.stringify(runStartState.current)));
                  }
                  resetCamera(DEFAULT_CAMERA);
                }}
              >
                Continue
              </button>
              <div className="game__end-hint">Press any key or click to continue</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default forwardRef(Game);