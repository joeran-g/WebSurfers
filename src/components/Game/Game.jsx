import confetti from "canvas-confetti";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Stage, Layer, Rect, Group } from "react-konva";

import InputOverlay from "../InputOverlay";
import Player from "./objects/Player";
import Flag from "./objects/Flag";
import LineObj from "./objects/Line";
import useCamera from "../../hooks/useCamera";
import useDrawing from "../../hooks/useDrawing";
import usePhysics from "../../hooks/usePhysics";
import useObjects from "../../hooks/useObjects";
import useApi from "../../hooks/useApi";
import useWorldPersistence from "../../hooks/useWorldPersistence";
import "../../styles/Game.css";
import { useTheme } from "../../context/ThemeContext";

const DEFAULT_WORLD = [
  { id: "player", type: "player", x: 70, y: 50 },
  { id: "flag", type: "flag", x: 750, y: 650 },
];

const DEFAULT_CAMERA = { x: 0, y: 0, zoom: 1 };

function Game({ onWorldChange }, ref) {
  const [physicsEnabled, setPhysicsEnabled] = useState(false);
  const [toolMode, setToolMode] = useState(null);
  const [toolMenuOpen, setToolMenuOpen] = useState(false);
  const [objectMenuPos, setObjectMenuPos] = useState(null);
  const [, forceRender] = useState(0);
  const [gameResult, setGameResult] = useState(null);
  const [worldId, setWorldId] = useState(null);
  const [ownedByMe, setOwnedByMe] = useState(false);
  const [worldName, setWorldName] = useState("Untitled World");
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [endScreenData, setEndScreenData] = useState(null);
  const [worldScores, setWorldScores] = useState({});
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const containerRef = useRef();
  const runStartState = useRef(null);
  const persistedWorldRef = useRef(null);
  const startTimeRef = useRef(null);
  const rafRef = useRef(null);
  const baseWorldStringRef = useRef("");
  const baseWorldWithScoresRef = useRef("");
  const scoreSavedRef = useRef(false);
  const currentWeeklyWorldIdRef = useRef(null);

  const markBaseWorldData = useCallback((worldData) => {
    const noScoreWorld = worldData.filter((obj) => obj.type !== "scores");
    baseWorldStringRef.current = JSON.stringify(noScoreWorld);
    baseWorldWithScoresRef.current = JSON.stringify(worldData);
    scoreSavedRef.current = false;
  }, []);

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
    clearPendingPositions,
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

  const { getWorlds, autoSaveWorld, username } = useApi();
  const { theme } = useTheme();
  const isCurrentWeeklyWorld = Boolean(
    worldId &&
      currentWeeklyWorldIdRef.current &&
      worldId === currentWeeklyWorldIdRef.current
  );

  const getCanvasBg = useCallback(() => {
    return theme === "light" ? "#e0f2fe" : "#1a1f2e";
  }, [theme]);

  const saveWorldData = useWorldPersistence(
    objects,
    worldId,
    isCurrentWeeklyWorld,
    ownedByMe,
    autoSaveWorld,
    isPlaying
  );

  const canAutoSaveWorld = Boolean(
    worldId && !isPlaying && (isCurrentWeeklyWorld || ownedByMe)
  );

  const attachScoresToObjects = useCallback((worldObjects, scores) => {
    const cleaned = worldObjects.filter((obj) => obj.type !== "scores");
    if (!scores || Object.keys(scores).length === 0) return cleaned;
    return [...cleaned, { type: "scores", scores }];
  }, []);

  const updateWorldInfo = useCallback(
    (name, weekly, owned) => {
      const resolvedName = name || "Untitled World";
      setWorldName(resolvedName);
      setOwnedByMe(Boolean(owned));
      onWorldChange?.({
        id: worldId,
        name: resolvedName,
        isWeekly: Boolean(weekly),
        ownedByMe: Boolean(owned),
      });
    },
    [onWorldChange, worldId]
  );

  const formatTime = useCallback((ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;
  }, []);

  const handleSaveScore = useCallback(() => {
    if (!username || !worldId) return;

    const newScores = { ...worldScores };
    if (!newScores[username] || elapsedTime < newScores[username]) {
      newScores[username] = elapsedTime;
    } else {
      return;
    }

    const updatedObjects = attachScoresToObjects(objects, newScores);
    setWorldScores(newScores);
    setObjects(updatedObjects);
    markBaseWorldData(updatedObjects);

    const scoreOnlyWorldData = attachScoresToObjects(
      persistedWorldRef.current || objects,
      newScores
    );

    const worldDataToSave = canAutoSaveWorld
      ? updatedObjects
      : scoreOnlyWorldData;

    persistedWorldRef.current = worldDataToSave;
    saveWorldData(worldDataToSave, true);
  }, [
    attachScoresToObjects,
    canAutoSaveWorld,
    elapsedTime,
    markBaseWorldData,
    objects,
    saveWorldData,
    username,
    worldId,
    worldScores,
  ]);

  const resetRun = useCallback(() => {
    setPhysicsEnabled(false);
    setIsPlaying(false);
    setGameResult(null);
    setSelectedId(null);
    setObjectMenuPos(null);
    if (runStartState.current) {
      setObjects(JSON.parse(JSON.stringify(runStartState.current)));
    }
    clearPendingPositions();
    resetCamera(DEFAULT_CAMERA);
  }, [clearPendingPositions, resetCamera, setObjects]);

  const startGame = useCallback(() => {
    runStartState.current = JSON.parse(JSON.stringify(objects));
    setSelectedId(null);
    setObjectMenuPos(null);
    setToolMode(null);
    setToolMenuOpen(false);
    setGameResult(null);
    resetCamera(DEFAULT_CAMERA);
    buildWorld();
    setPhysicsEnabled(true);
    setIsPlaying(true);
    startTimeRef.current = Date.now();
    setElapsedTime(0);
    setEndScreenData(null);
  }, [buildWorld, objects, resetCamera]);

  const handleContinue = useCallback(() => {
    setPhysicsEnabled(false);
    setIsPlaying(false);
    setGameResult(null);
    setEndScreenData(null);
    if (runStartState.current) {
      setObjects(JSON.parse(JSON.stringify(runStartState.current)));
    }
    resetCamera(DEFAULT_CAMERA);
  }, [resetCamera, setObjects]);

  const renderObject = useCallback(
    (obj) => {
      const renderObj = obj.id === selectedId && selectedObject ? selectedObject : obj;
      const isPlayer = renderObj.type === "player";
      const playerPos =
        isPlayer && physicsEnabled && playerBody.current
          ? playerBody.current.getPosition()
          : null;

      const x = playerPos ? playerPos.x * 30 : renderObj.x ?? 0;
      const y = playerPos ? playerPos.y * 30 : renderObj.y ?? 0;

      const commonProps = {
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

      if (renderObj.type === "player") return <Player key={renderObj.id} {...commonProps} />;
      if (renderObj.type === "flag") return <Flag key={renderObj.id} {...commonProps} />;
      if (renderObj.type === "line")
        return (
          <LineObj
            key={renderObj.id}
            {...commonProps}
            points={renderObj.points}
            stroke={theme === "light" ? "black" : "#ccc"}
          />
        );
      if (renderObj.type === "obstacle")
        return (
          <LineObj
            key={renderObj.id}
            {...commonProps}
            points={renderObj.points}
            stroke="red"
          />
        );
      return null;
    },
    [
      selectedId,
      selectedObject,
      physicsEnabled,
      playerBody,
      toolMode,
      theme,
      handleLineDragEnd,
      handleObjectDragEnd,
    ]
  );

  useEffect(() => {
    if (initialLoadDone) return;

    const loadInitialWorld = async () => {
      try {
        const worlds = await getWorlds();
        if (!worlds?.length) return;

        const weekly = worlds.find((world) => world.is_weekly_world);
        currentWeeklyWorldIdRef.current = weekly?.id || null;

        const selected = weekly || worlds[0];
        if (!selected?.world_data) return;

        setObjects(selected.world_data);
        setWorldId(selected.id || null);
        setOwnedByMe(false);
        updateWorldInfo(selected.name, Boolean(selected.is_weekly_world), false);
        runStartState.current = JSON.parse(JSON.stringify(selected.world_data));
        persistedWorldRef.current = selected.world_data;
        markBaseWorldData(selected.world_data);
      } catch (err) {
        console.error("Failed to load initial world:", err);
      } finally {
        setInitialLoadDone(true);
      }
    };

    loadInitialWorld();
  }, [initialLoadDone, getWorlds, markBaseWorldData, setObjects, updateWorldInfo]);

  useEffect(() => {
    const scoresObj = objects.find((obj) => obj.type === "scores");
    if (scoresObj && typeof scoresObj.scores === "object") {
      setWorldScores(scoresObj.scores);
    } else {
      setWorldScores({});
    }
  }, [objects]);

  useEffect(() => {
    const currentNoScores = objects.filter((obj) => obj.type !== "scores");
    const currentNoScoresString = JSON.stringify(currentNoScores);

    if (!baseWorldStringRef.current) {
      baseWorldStringRef.current = currentNoScoresString;
      return;
    }

    if (currentNoScoresString !== baseWorldStringRef.current) {
      if (objects.some((obj) => obj.type === "scores")) {
        setObjects((prev) => prev.filter((obj) => obj.type !== "scores"));
      }
      setWorldScores({});
      baseWorldStringRef.current = currentNoScoresString;
      scoreSavedRef.current = false;
    }
  }, [objects, setObjects]);

  useImperativeHandle(
    ref,
    () => ({
      getCurrentObjects: () => objects,
      loadWorld: (
        worldData,
        name = "Untitled World",
        id = null,
        isWeekly = false,
        owned = false
      ) => {
        if (!worldData) return;

        setPhysicsEnabled(false);
        setIsPlaying(false);
        setGameResult(null);
        setEndScreenData(null);
        setObjects(worldData);
        setWorldId(id);
        setOwnedByMe(Boolean(owned));
        setWorldScores(worldData.find((obj) => obj.type === "scores")?.scores || {});
        updateWorldInfo(name, isWeekly, owned);
        clearPendingPositions();
        setSelectedId(null);
        setObjectMenuPos(null);
        runStartState.current = JSON.parse(JSON.stringify(worldData));
        persistedWorldRef.current = worldData;
        resetCamera(DEFAULT_CAMERA);
        setInitialLoadDone(true);
        markBaseWorldData(worldData);
      },
      createBlankWorld: () => {
        setPhysicsEnabled(false);
        setIsPlaying(false);
        setGameResult(null);
        setEndScreenData(null);
        setObjects(DEFAULT_WORLD);
        setWorldId(null);
        setOwnedByMe(false);
        updateWorldInfo("Untitled World", false, false);
        clearPendingPositions();
        setSelectedId(null);
        setObjectMenuPos(null);
        runStartState.current = JSON.parse(JSON.stringify(DEFAULT_WORLD));
        persistedWorldRef.current = DEFAULT_WORLD;
        resetCamera(DEFAULT_CAMERA);
        setInitialLoadDone(true);
        markBaseWorldData(DEFAULT_WORLD);
      },
    }),
    [
      objects,
      setObjects,
      updateWorldInfo,
      resetCamera,
      clearPendingPositions,
      markBaseWorldData,
    ]
  );

  useEffect(() => {
    if (gameResult !== "win") return;

    const burst = () => {
      confetti({
        particleCount: 90,
        spread: 90,
        startVelocity: 40,
        origin: { x: 0.5, y: 0.5 },
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
  }, [toolMode]);

  useEffect(() => {
    if (!gameResult) return;
    setIsPlaying(false);
    setPhysicsEnabled(false);
    setEndScreenData({
      type: gameResult === "win" ? "win" : "death",
      time: elapsedTime,
    });
  }, [gameResult, elapsedTime]);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const tick = () => {
      if (startTimeRef.current !== null) {
        setElapsedTime(Date.now() - startTimeRef.current);
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isPlaying]);

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
  }, [physicsEnabled, gameResult, resetRun, startGame]);

  useEffect(() => {
    if (!endScreenData) return;
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
  }, [endScreenData, handleContinue]);

  useEffect(() => {
    if (!endScreenData || endScreenData.type !== "win" || !username || scoreSavedRef.current) return;
    handleSaveScore();
    scoreSavedRef.current = true;
  }, [endScreenData, handleSaveScore, username]);

  const topScores = useMemo(() => {
    return Object.entries(worldScores)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 10);
  }, [worldScores]);

  const handleMouseDown = (e) => {
    const stage = e.target.getStage();
    if (!stage) return;

    const clickedOnStageBackground =
      e.target === stage || e.target.name() === "background";
    const isDrawMode = toolMode === "draw" || toolMode === "draw-obstacle";

    if (physicsEnabled || gameResult) return;

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

    // Middle mouse button pans in any mode
    if (clickedOnStageBackground && e.evt.button === 1) {
      startPan(e.evt);
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

  const handleTouchStart = (e) => {
    const isDrawMode = toolMode === "draw" || toolMode === "draw-obstacle";
    
    // Two-finger touch always pans/zooms
    if (e.touches.length >= 2) {
      e.preventDefault();
      return;
    }

    if (isDrawMode) {
      // In draw mode, use drawing touch handlers
      if (drawing.handleTouchStart(e)) return;
      setSelectedId(null);
      return;
    }

    // Single finger pans in normal mode or with middle mouse
    if (e.touches[0]) {
      startPan(e.touches[0]);
    }
  };

  const handleTouchMove = (e) => {
    const isDrawMode = toolMode === "draw" || toolMode === "draw-obstacle";
    
    // Two-finger pinch zoom
    if (e.touches.length >= 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );
      
      // Store previous distance for delta calculation
      if (!window.lastPinchDist) {
        window.lastPinchDist = dist;
        return;
      }
      
      const delta = dist - window.lastPinchDist;
      const zoomDelta = 1 + delta * 0.01;
      
      handleWheel({ evt: { deltaY: -delta * 10 } });
      window.lastPinchDist = dist;
      return;
    }

    if (isDrawMode) {
      drawing.handleTouchMove(e);
      return;
    }

    // In normal mode, continue panning
    if (isPanning && e.touches[0]) {
      movePan(e.touches[0]);
    }
  };

  const handleTouchEnd = (e) => {
    window.lastPinchDist = null;
    
    const isDrawMode = toolMode === "draw" || toolMode === "draw-obstacle";
    
    if (isDrawMode) {
      const finishedLine = drawing.handleTouchEnd();
      if (finishedLine) {
        if (toolMode === "draw-obstacle") {
          finishedLine.type = "obstacle";
        }
        setObjects((prev) => [...prev, finishedLine]);
      }
      return;
    }

    // In normal mode, end panning
    if (isPanning) {
      endPan();
    }
  };

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  return (
    <div className="game">
      <div ref={containerRef} className="game__canvas-wrapper">
        <Stage
          width={stageSize.width}
          height={stageSize.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          style={{
            cursor: isPanning
              ? "grabbing"
              : toolMode === "draw" || toolMode === "draw-obstacle"
              ? "crosshair"
              : "default",
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
                  stroke={
                    toolMode === "draw-obstacle"
                      ? "red"
                      : theme === "light"
                      ? "black"
                      : "#ccc"
                  }
                />
              )}
            </Group>
          </Layer>
        </Stage>

        {!isPlaying && (
          <div className="game__controls">
            <button
              className="game__tools-toggle"
              onClick={() => setToolMenuOpen((prev) => !prev)}
            >
              Tools
            </button>
            <div className="game__action-row">
              <button onClick={startGame} disabled={physicsEnabled || !!gameResult}>
                Start 'Space'
              </button>
              <button onClick={resetRun} disabled={!physicsEnabled && !gameResult}>
                Reset 'R'
              </button>
            </div>
          </div>
        )}

        <div className={`tool-menu ${toolMenuOpen ? "tool-menu--open" : ""}`}>
          <button onClick={() => setToolMode("draw")}>Draw Line</button>
          <button onClick={() => setToolMode("draw-obstacle")}>Draw Obstacle</button>
          <button onClick={() => setToolMode("select")}>Move/Delete Object</button>
          <button
            className="tool-menu__close"
            onClick={() => {
              setToolMenuOpen(false);
              setToolMode(null);
            }}
          >
            Close
          </button>
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

        {physicsEnabled && !gameResult && !isPlaying && (
          <div className="game__status">
            Physics enabled — arrow left/right to move, space to jump
          </div>
        )}

        <InputOverlay isPlaying={isPlaying} onReset={resetRun} />

        {isPlaying && <div className="game__timer">{formatTime(elapsedTime)}</div>}

        {endScreenData && (
          <div className="game__end-screen">
            <div className="game__end-screen-content">
              <h2
                className={`game__end-screen-title game__end-screen-title--${endScreenData.type}`}
              >
                {endScreenData.type === "win" ? "YOU WIN!" : "YOU DIED"}
              </h2>
              <p className="game__end-screen-time">
                Time: {formatTime(endScreenData.time)}
              </p>
              <button className="game__button" onClick={handleContinue}>
                Continue
              </button>
            </div>
          </div>
        )}

        <div className="game__leaderboard">
          <button
            className="game__leaderboard-header"
            onClick={() => setLeaderboardOpen(!leaderboardOpen)}
          >
            <h4>Top Times</h4>
            <span className="game__leaderboard-toggle">
              {leaderboardOpen ? "▼" : "▶"}
            </span>
          </button>
          {leaderboardOpen && (
            <div className="game__leaderboard-list">
              {topScores.length > 0 ? (
                topScores.map(([name, time], i) => (
                  <div key={i} className="game__leaderboard-entry">
                    <span className="game__leaderboard-rank">#{i + 1}</span>
                    <span className="game__leaderboard-name">{name}</span>
                    <span className="game__leaderboard-time">
                      {formatTime(time)}
                    </span>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: "0.85rem", color: "#999" }}>
                  No times yet
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default forwardRef(Game);