import { useState, useEffect } from "react";

const DEFAULT_WORLD = [
  { id: "player", type: "player", x: 70, y: 50 },
  { id: "flag", type: "flag", x: 750, y: 650 },
];

export default function useWorldPersistence() {
  const [username, setUsername] = useState(localStorage.getItem("username") || null);
  const [currentWorld, setCurrentWorld] = useState(DEFAULT_WORLD);

  useEffect(() => {

    // Load weekly world on mount
    const weekly = JSON.parse(localStorage.getItem("weeklyWorld")) || DEFAULT_WORLD;
    setCurrentWorld(weekly);
  }, [username]);

  function saveWorld(name, objects) {
    if (!username) return;
    const worlds = JSON.parse(localStorage.getItem(`worlds_${username}`)) || {};
    worlds[name] = objects;
    localStorage.setItem(`worlds_${username}`, JSON.stringify(worlds));
  }

  function loadWorld(name) {
    if (!username) return DEFAULT_WORLD;
    const worlds = JSON.parse(localStorage.getItem(`worlds_${username}`)) || {};
    return worlds[name] || DEFAULT_WORLD;
  }

  function getPersonalWorlds() {
    if (!username) return [];
    const worlds = JSON.parse(localStorage.getItem(`worlds_${username}`)) || {};
    return Object.keys(worlds);
  }

  function setWeeklyWorld(objects) {
    localStorage.setItem("weeklyWorld", JSON.stringify(objects));
  }

  return {
    username,
    currentWorld,
    setCurrentWorld,
    saveWorld,
    loadWorld,
    getPersonalWorlds,
    setWeeklyWorld,
  };
}