import { useState, useRef } from "react";

export default function useObjects(initialObjects = []) {
  const [objects, setObjects] = useState(initialObjects);
  const [selectedId, setSelectedId] = useState(null);
  const [draftPositions, setDraftPositions] = useState({});

  function handleObjectDragEnd(id, e) {
    const { x, y } = e.target.position();
    setDraftPositions((prev) => ({ ...prev, [id]: { x, y } }));
    setSelectedId(id);
  }

  function handleLineDragEnd(id, e) {
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
    if ((obj.type === "player" || obj.type === "flag") && sameTypeCount <= 1) return;
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

  return {
    objects,
    setObjects,
    selectedId,
    setSelectedId,
    draftPositions,
    setDraftPositions,
    handleObjectDragEnd,
    handleLineDragEnd,
    saveSelectedPosition,
    deleteSelectedObject,
    canDeleteSelectedObject,
    isSelectedMoveSaved,
  };
}