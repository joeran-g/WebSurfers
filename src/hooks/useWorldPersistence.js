import { useEffect, useRef, useCallback } from "react";

const DEFAULT_WORLD = [
  { id: "player", type: "player", x: 70, y: 50 },
  { id: "flag", type: "flag", x: 750, y: 650 },
];

export default function useWorldPersistence(objects, worldId, isWeeklyWorld, autoSaveWorld) {
  const debounceTimer = useRef(null);
  const lastSavedData = useRef(null);

  const saveWorldData = useCallback(async () => {
    if (!worldId || !isWeeklyWorld) return;
    const worldData = JSON.stringify(objects);
    if (worldData === lastSavedData.current) return; // no changes
    lastSavedData.current = worldData;
    await autoSaveWorld(worldId, objects);
  }, [worldId, isWeeklyWorld, objects, autoSaveWorld]);

  useEffect(() => {
    if (!isWeeklyWorld) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      saveWorldData();
    }, 1500);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [objects, isWeeklyWorld, saveWorldData]);

  return {
    saveWorldData,
  };
}