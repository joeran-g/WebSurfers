import { useCallback, useMemo, useState } from "react";

export default function useObjects(initialObjects = []) {
  const [objects, setObjects] = useState(initialObjects);
  const [selectedId, setSelectedId] = useState(null);
  const [pendingPositions, setPendingPositions] = useState({});

  const selectedObject = useMemo(() => {
    if (!selectedId) return null;
    const object = objects.find((item) => item.id === selectedId);
    if (!object) return null;
    const pending = pendingPositions[selectedId];
    return pending ? { ...object, ...pending } : object;
  }, [objects, pendingPositions, selectedId]);

  const handleObjectDragEnd = useCallback((id, event) => {
    const { x, y } = event.target.position();
    setPendingPositions((prev) => ({ ...prev, [id]: { x, y } }));
  }, []);

  const handleLineDragEnd = useCallback((id, event) => {
    const { x, y } = event.target.position();
    setPendingPositions((prev) => ({ ...prev, [id]: { x, y } }));
  }, []);

  const saveSelectedObjectPosition = useCallback(() => {
    if (!selectedId) return;
    setObjects((prev) =>
      prev.map((obj) =>
        obj.id === selectedId
          ? { ...obj, ...(pendingPositions[selectedId] || {}) }
          : obj
      )
    );
    setPendingPositions((prev) => {
      const next = { ...prev };
      delete next[selectedId];
      return next;
    });
  }, [pendingPositions, selectedId]);

  const clearPendingPosition = useCallback(() => {
    if (!selectedId) return;
    setPendingPositions((prev) => {
      const next = { ...prev };
      delete next[selectedId];
      return next;
    });
  }, [selectedId]);

  const deleteSelectedObject = useCallback(() => {
    setObjects((prev) => prev.filter((obj) => obj.id !== selectedId));
    setPendingPositions((prev) => {
      const next = { ...prev };
      delete next[selectedId];
      return next;
    });
    setSelectedId(null);
  }, [selectedId]);

  const canDeleteSelectedObject = useCallback(() => {
    if (!selectedId) return false;
    const obj = objects.find((item) => item.id === selectedId);
    if (!obj) return false;
    if (obj.type === "player") return objects.filter((item) => item.type === "player").length > 1;
    if (obj.type === "flag") return objects.filter((item) => item.type === "flag").length > 1;
    return true;
  }, [objects, selectedId]);

  return {
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
  };
}