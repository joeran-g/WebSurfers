import { useEffect, useRef, useCallback } from "react";

export default function useWorldPersistence(objects, worldId, isWeeklyWorld, autoSaveWorld) {
  const debounceTimer = useRef(null);
  const lastSavedData = useRef(null);

  const saveWorldData = useCallback(async () => {
    if (!worldId) return;
    const serialized = JSON.stringify(objects);
    if (serialized === lastSavedData.current) return;
    lastSavedData.current = serialized;
    await autoSaveWorld(worldId, objects);
  }, [worldId, objects, autoSaveWorld]);

  useEffect(() => {
    if (!worldId) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      saveWorldData();
    }, 1500);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [objects, worldId, saveWorldData]);

  return {
    saveWorldData,
  };
}