import { useState, useEffect } from "react";
import useApi from "../hooks/useApi";
import "../styles/Menu.css";

export default function Menu({
  onClose,
  onLoadWorld,
  onCreateBlankWorld,
  getCurrentWorld,
  currentWorldMeta,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authMessage, setAuthMessage] = useState("");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [userWorlds, setUserWorlds] = useState([]);
  const [publicWorlds, setPublicWorlds] = useState([]);
  const [saveName, setSaveName] = useState("");
  const [saveCurrentName, setSaveCurrentName] = useState("");
  const [saveResult, setSaveResult] = useState("");
  const [saveCurrentResult, setSaveCurrentResult] = useState("");
  const [loadError, setLoadError] = useState("");

  const {
    isGuest,
    username,
    login,
    register,
    logout,
    getWorlds,
    getUserWorlds,
    saveWorld,
    createWorld,
    updateWorld,
    loadWorld,
  } = useApi();

  useEffect(() => {
    setIsOpen(true);
  }, []);

  useEffect(() => {
    const fetchPublic = async () => {
      const worlds = await getWorlds();
      setPublicWorlds(worlds || []);
    };
    fetchPublic();
  }, [getWorlds]);

  useEffect(() => {
    if (!isGuest) {
      getUserWorlds().then(setUserWorlds);
    } else {
      setUserWorlds([]);
    }
  }, [isGuest, getUserWorlds]);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 400);
  };

  const handleLogin = async () => {
    setAuthMessage("");
    const result = await login(loginUsername, loginPassword);
    if (result?.ok) {
      setAuthMessage("Logged in successfully.");
      setLoginUsername("");
      setLoginPassword("");
      setAuthMode("login");
    } else {
      setAuthMessage(result?.message || "Login failed.");
    }
  };

  const handleRegister = async () => {
    setAuthMessage("");
    const result = await register(registerUsername, registerPassword);
    if (result?.ok) {
      setAuthMessage("Registered successfully. Please log in.");
      setRegisterUsername("");
      setRegisterPassword("");
      setAuthMode("login");
    } else {
      setAuthMessage(result?.message || "Registration failed.");
    }
  };

  const handleSaveCurrentWorld = async () => {
    setSaveCurrentResult("");
    const name = saveCurrentName.trim() || currentWorldMeta?.name || "Untitled World";
    const worldData = getCurrentWorld();
    if (!Array.isArray(worldData) || !worldData.length) {
      return setSaveCurrentResult("Nothing to save.");
    }

    try {
      let savedWorld;
      if (currentWorldMeta?.id && currentWorldMeta?.ownedByMe) {
        savedWorld = await updateWorld(currentWorldMeta.id, {
          name,
          world_data: worldData,
        });
        setSaveCurrentResult("Saved changes to current world.");
      } else {
        savedWorld = await createWorld(name, worldData, false);
        setSaveCurrentResult("Saved a copy to your worlds.");
        setUserWorlds(await getUserWorlds());
      }

      onLoadWorld(worldData, savedWorld.name, savedWorld.id, Boolean(savedWorld.is_weekly_world), true);
      setSaveCurrentName("");
    } catch (err) {
      console.error(err);
      setSaveCurrentResult("Save failed.");
    }
  };

  const handleSavePublic = async () => {
    if (!saveName.trim()) return setSaveResult("Enter a world name first.");
    const worldData = getCurrentWorld();
    if (!Array.isArray(worldData) || !worldData.length) {
      return setSaveResult("Current world is empty.");
    }
    try {
      await saveWorld(saveName.trim(), worldData, true);
      setSaveResult("Saved public world!");
      setSaveName("");
      setPublicWorlds(await getWorlds());
    } catch (err) {
      console.error(err);
      setSaveResult("Save failed.");
    }
  };

  const handleLoadWorld = async (world, ownedByMe = false) => {
    setLoadError("");
    try {
      const worldData = world.world_data || (await loadWorld(world.id))?.world_data;
      if (!worldData) throw new Error("Invalid world data");
      onLoadWorld(worldData, world.name || "Untitled World", world.id, Boolean(world.is_weekly_world), ownedByMe);
      handleClose();
    } catch (err) {
      console.error(err);
      setLoadError("Unable to load world.");
    }
  };

  const handleCreateBlankWorld = () => {
    onCreateBlankWorld?.();
    handleClose();
  };

  const currentIsOwned = Boolean(currentWorldMeta?.id && currentWorldMeta?.ownedByMe);

  return (
    <>
      <div className={`menu__overlay ${!isOpen ? "menu__overlay--closing" : ""}`} onClick={handleClose} />
      <div className={`menu ${isOpen ? "menu_open" : ""}`}>
        <div className="menu__header">
          <h2>Menu</h2>
          <button className="menu_closed" onClick={handleClose}>✕</button>
        </div>

        {authMessage && <div className="menu__alert">{authMessage}</div>}

        {isGuest ? (
          <div className="menu__section">
            <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
              <button
                className={`menu__button ${authMode === "login" ? "menu__button--primary" : ""}`}
                onClick={() => setAuthMode("login")}
              >
                Login
              </button>
              <button
                className={`menu__button ${authMode === "register" ? "menu__button--primary" : ""}`}
                onClick={() => setAuthMode("register")}
              >
                Register
              </button>
            </div>

            {authMode === "login" ? (
              <>
                <input
                  className="menu__button"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Username"
                />
                <input
                  className="menu__button"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Password"
                />
                <button className="menu__button menu__button--primary" onClick={handleLogin}>
                  Login
                </button>
              </>
            ) : (
              <>
                <input
                  className="menu__button"
                  value={registerUsername}
                  onChange={(e) => setRegisterUsername(e.target.value)}
                  placeholder="Username"
                />
                <input
                  className="menu__button"
                  type="password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  placeholder="Password"
                />
                <button className="menu__button menu__button--primary" onClick={handleRegister}>
                  Register
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="menu__section">
            <p>Logged in as <strong>{username}</strong></p>
            <button className="menu__button menu__button--primary" onClick={logout}>
              Logout
            </button>
          </div>
        )}

        <div className="menu__section">
          <h3>Create / load worlds</h3>
          <button className="menu__button" onClick={handleCreateBlankWorld}>
            Create blank world
          </button>
        </div>

        <div className="menu__section">
          <h3>Save current world</h3>
          {isGuest ? (
            <p>Login to save the current world to your account.</p>
          ) : (
            <>
              <input
                className="menu__button"
                value={saveCurrentName}
                onChange={(e) => setSaveCurrentName(e.target.value)}
                placeholder={currentWorldMeta?.name || "World name"}
              />
              <button
                className="menu__button menu__button--primary"
                onClick={handleSaveCurrentWorld}
              >
                {currentIsOwned ? "Save changes" : "Save a copy to my worlds"}
              </button>
              {saveCurrentResult && <p style={{ marginTop: 8, fontSize: "13px" }}>{saveCurrentResult}</p>}
            </>
          )}
        </div>

        {!isGuest && (
          <div className="menu__section">
            <h3>Save public world</h3>
            <input
              className="menu__button"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Public world name"
            />
            <button
              className="menu__button menu__button--primary"
              onClick={handleSavePublic}
            >
              Save public world
            </button>
            {saveResult && <p style={{ marginTop: 8, fontSize: "13px" }}>{saveResult}</p>}
          </div>
        )}

        <div className="menu__section">
          <h3>Official worlds</h3>
          {publicWorlds.length ? (
            publicWorlds.map((world) => (
              <div key={world.id} style={{ marginBottom: 10 }}>
                <strong>{world.name || "Untitled"}</strong>
                {world.is_weekly_world && (
                  <span style={{ marginLeft: 8, fontSize: 12, color: "#60a5fa" }}>
                    Weekly
                  </span>
                )}
                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                  <button className="menu__button" onClick={() => handleLoadWorld(world, false)}>
                    Load
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p>No official worlds available.</p>
          )}
          {loadError && <p style={{ color: "#f87171", marginTop: 8 }}>{loadError}</p>}
        </div>

        {!isGuest && (
          <div className="menu__section">
            <h3>Your worlds</h3>
            {userWorlds.length ? (
              <ul style={{ listStyle: "none", padding: 0 }}>
                {userWorlds.map((world) => (
                  <li key={world.id} style={{ marginBottom: 10 }}>
                    <strong>{world.name}</strong>
                    <button className="menu__button" onClick={() => handleLoadWorld(world, true)}>
                      Load
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>You have no saved worlds yet.</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}