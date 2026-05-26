import { useState, useEffect } from "react";
import useApi from "../hooks/useApi";
import "../styles/Menu.css";

export default function Menu({
  onClose,
  onLoadWorld,
  onCreateBlankWorld,
  getCurrentWorld,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // login or register
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [userWorlds, setUserWorlds] = useState([]);
  const [publicWorlds, setPublicWorlds] = useState([]);
  const [saveName, setSaveName] = useState("");
  const [saveResult, setSaveResult] = useState("");
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
    loadWorld,
    downloadWorld,
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
    setTimeout(onClose, 500);
  };

  const handleLogin = async () => {
    if (await login(loginUsername, loginPassword)) {
      setLoginUsername("");
      setLoginPassword("");
      setAuthMode("login");
    }
  };

  const handleRegister = async () => {
    if (await register(registerUsername, registerPassword)) {
      setRegisterUsername("");
      setRegisterPassword("");
      setAuthMode("login");
    }
  };

  const handleSavePublic = async () => {
    if (!saveName) return setSaveResult("Enter a world name first.");
    if (!getCurrentWorld) return setSaveResult("Unable to read current world.");
    const worldData = getCurrentWorld();
    if (!Array.isArray(worldData) || !worldData.length) {
      return setSaveResult("Current world is empty.");
    }

    try {
      await saveWorld(saveName, worldData, true);
      setSaveResult("Saved public world!");
      setSaveName("");
      setPublicWorlds(await getWorlds());
    } catch (err) {
      setSaveResult("Save failed.");
      console.error(err);
    }
  };

  const handleLoadWorld = async (world) => {
    setLoadError("");
    try {
      const worldData = world.world_data || (await loadWorld(world.id))?.world_data;
      if (!worldData) throw new Error("Invalid world data");
      onLoadWorld(worldData);
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

  return (
    <>
      <div className={`menu__overlay ${!isOpen ? "menu__overlay--closing" : ""}`} onClick={handleClose} />
      <div className={`menu ${isOpen ? "menu_open" : ""}`}>
        <div className="menu__header">
          <h2>Menu</h2>
          <button className="menu_closed" onClick={handleClose}>✕</button>
        </div>

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

        {!isGuest && (
          <div className="menu__section">
            <p>Logged in as <strong>{username}</strong></p>
            <button className="menu__button menu__button--primary" onClick={logout}>
              Logout
            </button>
          </div>
        )}

        <div className="menu__section">
          <h3>Create</h3>
          <button className="menu__button" onClick={handleCreateBlankWorld}>
            Create blank world
          </button>
        </div>

        {!isGuest && (<div className="menu__section">
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
            disabled={isGuest}
          >
            Save public world
          </button>
          {isGuest && (
            <p style={{ fontSize: "12px", color: "#f1f5f9" }}>
              Login to save public worlds.
            </p>
          )}
          {saveResult && <p style={{ marginTop: 8, fontSize: "13px" }}>{saveResult}</p>}
        </div>)}

        <div className="menu__section">
          <h3>Official worlds</h3>
          {publicWorlds.length ? (
            publicWorlds.map((world) => (
              <div key={world.id} style={{ marginBottom: 10 }}>
                <strong>{world.name || "Untitled"}</strong>
                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                  <button className="menu__button" onClick={() => handleLoadWorld(world)}>
                    Load
                  </button>
                  <button
                    className="menu__button"
                    onClick={() => downloadWorld(world.id)}
                  >
                    Download
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
                    <button className="menu__button" onClick={() => handleLoadWorld(world)}>
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