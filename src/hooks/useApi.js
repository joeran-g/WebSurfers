import { useCallback, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
const TOKEN_STORAGE_KEY = "websurfers_token";
const USERNAME_KEY = "websurfers_username";
const USERID_KEY = "websurfers_userid";

export default function useApi() {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_STORAGE_KEY));
  const [username, setUsername] = useState(localStorage.getItem(USERNAME_KEY) || null);
  const [userId, setUserId] = useState(localStorage.getItem(USERID_KEY) || null);

  const authHeaders = useCallback(
    (json = true) => {
      const headers = {};
      if (json) headers["Content-Type"] = "application/json";
      if (token) headers["Authorization"] = `Bearer ${token}`;
      return headers;
    },
    [token]
  );

  const login = useCallback(async (usernameInput, password) => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameInput, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        return { ok: false, message: data.detail || "Invalid credentials" };
      }

      // store token and returned user info (if any)
      if (data.access_token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
        setToken(data.access_token);
      }

      const returnedUser = data.user || { username: usernameInput, id: null };
      if (returnedUser.username) {
        localStorage.setItem(USERNAME_KEY, returnedUser.username);
        setUsername(returnedUser.username);
      }
      if (returnedUser.id) {
        localStorage.setItem(USERID_KEY, returnedUser.id);
        setUserId(returnedUser.id);
      }

      return { ok: true };
    } catch (err) {
      console.error(err);
      return { ok: false, message: "Login request failed" };
    }
  }, []);

  const register = useCallback(async (usernameInput, password) => {
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameInput, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        return { ok: false, message: data.detail || "Registration failed" };
      }

      // if backend returned token+user, persist and set state (auto-login)
      if (data.access_token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
        setToken(data.access_token);
      }
      const returnedUser = data.user || { username: usernameInput, id: null };
      if (returnedUser.username) {
        localStorage.setItem(USERNAME_KEY, returnedUser.username);
        setUsername(returnedUser.username);
      }
      if (returnedUser.id) {
        localStorage.setItem(USERID_KEY, returnedUser.id);
        setUserId(returnedUser.id);
      }

      return { ok: true };
    } catch (err) {
      console.error(err);
      return { ok: false, message: "Registration request failed" };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USERNAME_KEY);
    localStorage.removeItem(USERID_KEY);
    setToken(null);
    setUsername(null);
    setUserId(null);
  }, []);

  const getWorlds = useCallback(async () => {
    const response = await fetch(`${API_BASE}/worlds`);
    if (!response.ok) return [];
    return response.json();
  }, []);

  const getUserWorlds = useCallback(async () => {
    if (!token) return [];
    const response = await fetch(`${API_BASE}/worlds/user`, { headers: authHeaders() });
    if (!response.ok) return [];
    return response.json();
  }, [authHeaders, token]);

  const createWorld = useCallback(
    async (name, worldData, isPublic = false) => {
      const response = await fetch(`${API_BASE}/worlds/create`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name,
          description: "",
          is_public: Boolean(isPublic),
          world_data: worldData,
        }),
      });
      if (!response.ok) throw new Error("Create world failed");
      return response.json();
    },
    [authHeaders]
  );

  const updateWorld = useCallback(
    async (worldId, payload) => {
      if (!worldId) throw new Error("Missing world id");
      const response = await fetch(`${API_BASE}/worlds/${worldId}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Update world failed");
      return response.json();
    },
    [authHeaders]
  );

  const saveWorld = useCallback(
    (name, worldData, isPublic = false) => createWorld(name, worldData, isPublic),
    [createWorld]
  );

  const loadWorld = useCallback(async (worldId) => {
    const response = await fetch(`${API_BASE}/worlds/${worldId}`);
    if (!response.ok) return null;
    return response.json();
  }, []);

  const autoSaveWorld = useCallback(
    async (worldId, worldData, ownedByMe = false) => {
      if (!worldId || !worldData) return false;
      const url = ownedByMe
        ? `${API_BASE}/worlds/${worldId}`
        : `${API_BASE}/worlds/${worldId}/auto-save`;
      try {
        const response = await fetch(url, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ world_data: worldData }),
        });
        window.dispatchEvent(new CustomEvent("autosave", { detail: { ok: response.ok } }));
        return response.ok;
      } catch (err) {
        console.error("Auto-save failed:", err);
        window.dispatchEvent(new CustomEvent("autosave", { detail: { ok: false } }));
        return false;
      }
    },
    [token]
  );

  return {
    isGuest: !token,
    username,
    userId,
    login,
    register,
    logout,
    getWorlds,
    getUserWorlds,
    saveWorld,
    createWorld,
    updateWorld,
    loadWorld,
    autoSaveWorld,
  };
}