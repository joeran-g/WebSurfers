import { useEffect, useRef, useCallback } from "react";

export default function useWorldPersistence(
  objects,
  worldId,
  isCurrentWeeklyWorld,
  ownedByMe,
  autoSaveWorld,
  isPlaying
) {
  const debounceTimer = useRef(null);
  const lastSavedData = useRef(null);
  const lastWorldId = useRef(worldId);
  const lastAutoSaveEnabled = useRef(false);

  const canAutoSave = Boolean(
    worldId && !isPlaying && (isCurrentWeeklyWorld || ownedByMe)
  );

  const saveWorldData = useCallback(
    async (objectsToSave = objects, force = false) => {
      if (!force && !canAutoSave) return false;

      const serialized = JSON.stringify(objectsToSave);
      if (!force && serialized === lastSavedData.current) return false;

      lastSavedData.current = serialized;
      await autoSaveWorld(worldId, objectsToSave);
      return true;
    },
    [autoSaveWorld, canAutoSave, objects, worldId]
  );

  useEffect(() => {
    if (!canAutoSave) {
      lastAutoSaveEnabled.current = false;
      return;
    }

    const serialized = JSON.stringify(objects);

    if (worldId !== lastWorldId.current || !lastAutoSaveEnabled.current) {
      lastWorldId.current = worldId;
      lastAutoSaveEnabled.current = true;
      lastSavedData.current = serialized;
      return;
    }

    if (serialized === lastSavedData.current) return;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(() => {
      saveWorldData();
    }, 1500);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [canAutoSave, objects, saveWorldData, worldId]);

  return saveWorldData;
}