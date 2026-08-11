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
  const [weeklyWorlds, setWeeklyWorlds] = useState([]);
  const [loadingWorlds, setLoadingWorlds] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [activeTab, setActiveTab] = useState("weekly");
  
  // Save modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveModalName, setSaveModalName] = useState("");
  const [saveModalPublic, setSaveModalPublic] = useState(false);
  const [saveModalResult, setSaveModalResult] = useState("");

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
      setLoadingWorlds(true);
      const worlds = await getWorlds();
      const weekly = worlds?.filter((w) => w.is_weekly_world || w.name.includes("Weekly")) || [];
      const publicWorlds = worlds?.filter((w) => w.is_public && !w.name.includes("Weekly")) || [];
      setWeeklyWorlds(weekly);
      setPublicWorlds(publicWorlds);
      setLoadingWorlds(false);
    };
    fetchPublic();
  }, [getWorlds]);

  useEffect(() => {
    if (!isGuest) {
      const fetchUserWorlds = async () => {
        setLoadingWorlds(true);
        const worlds = await getUserWorlds();
        setUserWorlds(worlds || []);
        setLoadingWorlds(false);
      };
      fetchUserWorlds();
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

  const handleOpenSaveModal = () => {
    setSaveModalName(currentWorldMeta?.name || "");
    setSaveModalPublic(false);
    setSaveModalResult("");
    setShowSaveModal(true);
  };

  const handleCloseSaveModal = () => {
    setShowSaveModal(false);
    setSaveModalName("");
    setSaveModalPublic(false);
    setSaveModalResult("");
  };

  const handleSaveFromModal = async () => {
    setSaveModalResult("");
    const name = saveModalName.trim() || currentWorldMeta?.name || "Untitled World";
    const worldData = getCurrentWorld();
    if (!Array.isArray(worldData) || !worldData.length) {
      return setSaveModalResult("Nothing to save.");
    }

    try {
      let savedWorld;
      if (currentWorldMeta?.id && currentWorldMeta?.ownedByMe) {
        savedWorld = await updateWorld(currentWorldMeta.id, {
          name,
          is_public: saveModalPublic,
          world_data: worldData,
        });
        setSaveModalResult("Saved changes!");
      } else {
        savedWorld = await createWorld(name, worldData, saveModalPublic);
        setSaveModalResult("World saved!");
        setUserWorlds(await getUserWorlds());
      }

      onLoadWorld(worldData, savedWorld.name, savedWorld.id, Boolean(savedWorld.is_weekly_world), true);
      setTimeout(handleCloseSaveModal, 800);
    } catch (err) {
      console.error(err);
      setSaveModalResult("Save failed.");
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

  const renderWorldList = (worlds, isOwnedByUser = false) => {
    if (loadingWorlds) {
      return <p style={{ textAlign: "center", color: "#999" }}>Loading Worlds…</p>;
    }
    if (!worlds.length) {
      return <p>{isOwnedByUser ? "You have no saved worlds yet." : "No worlds available."}</p>;
    }
    return (
      <div className="menu__world-list">
        {worlds.map((world) => (
          <div key={world.id} className="menu__world-item">
            <div className="menu__world-info">
              <strong>{world.name || "Untitled"}</strong>
              {world.is_weekly_world && (
                <span className="menu__world-badge">Weekly</span>
              )}
            </div>
            <button className="menu__button menu__button--small" onClick={() => handleLoadWorld(world, isOwnedByUser)}>
              Load
            </button>
          </div>
        ))}
      </div>
    );
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
          <h3>Create world</h3>
          <button className="menu__button" onClick={handleCreateBlankWorld}>
            Create blank world
          </button>
        </div>

        {!isGuest && (
          <div className="menu__section">
            <button
              className="menu__button menu__button--primary"
              onClick={handleOpenSaveModal}
            >
              Save current world
            </button>
          </div>
        )}

        <div className="menu__section">
          <h3>Worlds</h3>
          <div className="menu__tabs">
            <button
              className={`menu__tab ${activeTab === "weekly" ? "menu__tab--active" : ""}`}
              onClick={() => setActiveTab("weekly")}
            >
              Weekly
            </button>
            <button
              className={`menu__tab ${activeTab === "public" ? "menu__tab--active" : ""}`}
              onClick={() => setActiveTab("public")}
            >
              Public
            </button>
            {!isGuest && (
              <button
                className={`menu__tab ${activeTab === "personal" ? "menu__tab--active" : ""}`}
                onClick={() => setActiveTab("personal")}
              >
                Personal
              </button>
            )}
          </div>

          {activeTab === "weekly" && renderWorldList(weeklyWorlds, false)}
          {activeTab === "public" && renderWorldList(publicWorlds, false)}
          {activeTab === "personal" && !isGuest && renderWorldList(userWorlds, true)}

          {loadError && <p style={{ color: "#f87171", marginTop: 8 }}>{loadError}</p>}
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <>
          <div className="menu__modal-overlay" onClick={handleCloseSaveModal} />
          <div className="menu__modal">
            <div className="menu__modal-header">
              <h3>Save World</h3>
              <button className="menu__modal-close" onClick={handleCloseSaveModal}>✕</button>
            </div>

            <input
              className="menu__button"
              value={saveModalName}
              onChange={(e) => setSaveModalName(e.target.value)}
              placeholder="World name"
              autoFocus
            />

            <label className="menu__checkbox-label">
              <input
                type="checkbox"
                checked={saveModalPublic}
                onChange={(e) => setSaveModalPublic(e.target.checked)}
              />
              <span>Make public</span>
            </label>

            <button className="menu__button menu__button--primary" onClick={handleSaveFromModal}>
              Save
            </button>

            {saveModalResult && (
              <p style={{ marginTop: 12, fontSize: "13px", textAlign: "center" }}>
                {saveModalResult}
              </p>
            )}
          </div>
        </>
      )}
    </>
  );
}