import { useCallback, useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5173";

export default function useApi() {
  const [isGuest, setIsGuest] = useState(true);
  const [username, setUsername] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [currentWeeklyWorldId, setCurrentWeeklyWorldId] = useState(null);


  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      setIsGuest(false);
    } else {
      localStorage.removeItem("token");
      setIsGuest(true);
      setUsername(null);
    }
  }, [token]);

  useEffect(() => {
    if (username) localStorage.setItem("username", username);
    else localStorage.removeItem("username");
  }, [username]);

  const logout = useCallback(() => {
    setToken(null);
    setUsername(null);
    setIsGuest(true);
  }, []);

  const apiCall = useCallback(
    async (endpoint, options = {}) => {
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: { ...headers, ...options.headers },
      });

      if (!response.ok) {
        if (response.status === 401) logout();
        const text = await response.text();
        throw new Error(text || response.statusText);
      }

      if (response.status === 204) return null;
      const contentType = response.headers.get("content-type") || "";
      return contentType.includes("application/json") ? response.json() : null;
    },
    [token, logout]
  );

  const login = useCallback(
    async (usernameInput, password) => {
      try {
        const result = await apiCall("/auth/login", {
          method: "POST",
          body: JSON.stringify({ username: usernameInput, password }),
        });
        setToken(result.access_token || result.token);
        setUsername(usernameInput);
        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
    },
    [apiCall]
  );

  const register = useCallback(
    async (usernameInput, password) => {
      try {
        await apiCall("/auth/register", {
          method: "POST",
          body: JSON.stringify({ username: usernameInput, password }),
        });
        return login(usernameInput, password);
      } catch (error) {
        console.error(error);
        return false;
      }
    },
    [apiCall, login]
  );

  const getWorlds = useCallback(async () => {
    try {
      return await apiCall("/worlds");
    } catch (error) {
      console.error(error);
      return [];
    }
  }, [apiCall]);

  const getUserWorlds = useCallback(async () => {
    if (!token) return [];
    try {
      return await apiCall("/worlds/user");
    } catch (error) {
      console.error(error);
      return [];
    }
  }, [apiCall, token]);

  const saveWorld = useCallback(
    async (name, worldData, isPublic = false, description = "") => {
      if (!token) throw new Error("Not authenticated");
      return await apiCall("/worlds", {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          is_public: isPublic,
          world_data: worldData,
        }),
      });
    },
    [apiCall, token]
  );

  const updateWorld = useCallback(
    async (worldId, payload) => {
      if (!token) throw new Error("Not authenticated");
      return await apiCall(`/worlds/${worldId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    [apiCall, token]
  );

  const deleteWorld = useCallback(
    async (worldId) => {
      if (!token) throw new Error("Not authenticated");
      return await apiCall(`/worlds/${worldId}`, { method: "DELETE" });
    },
    [apiCall, token]
  );

  const loadWorld = useCallback(
    async (worldId) => {
      try {
        return await apiCall(`/worlds/${worldId}`);
      } catch (error) {
        console.error(error);
        return null;
      }
    },
    [apiCall]
  );

  const downloadWorld = useCallback(
    async (worldId) => {
      const world = await loadWorld(worldId);
      if (!world) return;
      const blob = new Blob([JSON.stringify(world.world_data)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${world.name || "world"}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [loadWorld]
  );

  const autoSaveWorld = useCallback(
    async (worldId, worldData) => {
      if (!worldId || !worldData) return false;
      try {
        const response = await fetch(`${API_BASE}/worlds/${worldId}/auto-save`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({ world_data: worldData }),
        });
        return response.ok;
      } catch (err) {
        console.error("Auto-save failed:", err);
        return false;
      }
    },
    [token]
  );

  const createWeeklyWorld = useCallback(async () => {
    if (!token) return null;
    try {
      const response = await fetch(`${API_BASE}/worlds/weekly/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to create weekly world");
      const world = await response.json();
      setCurrentWeeklyWorldId(world.id);
      return world;
    } catch (err) {
      console.error("Create weekly world failed:", err);
      return null;
    }
  }, [token]);

  return {
    isGuest,
    username,
    login,
    register,
    logout,
    getWorlds,
    getUserWorlds,
    saveWorld,
    loadWorld,
    downloadWorld,
    apiCall,
    autoSaveWorld,
    createWeeklyWorld,
    currentWeeklyWorldId,
    setCurrentWeeklyWorldId,
  };
}