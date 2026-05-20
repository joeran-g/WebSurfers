import { useState, useEffect } from "react";
import useApi from "../hooks/useApi";
import "../styles/Menu.css";

export default function Menu({ onClose }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [userWorlds, setUserWorlds] = useState([]);
  const [saveName, setSaveName] = useState("");
  const [loadId, setLoadId] = useState("");

  const { isGuest, username, login, register, logout, getUserWorlds, saveWorld, loadWorld, downloadWorld } = useApi();

  // Trigger animation on mount
  useEffect(() => {
    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (!isGuest) {
      getUserWorlds().then(setUserWorlds);
    }
  }, [isGuest, getUserWorlds]);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 500); // Wait for animation, then unmount
  };

  const handleLogin = async () => {
    if (await login(loginUsername, loginPassword)) {
      setLoginUsername("");
      setLoginPassword("");
    }
  };

  const handleRegister = async () => {
    if (await register(registerUsername, registerPassword)) {
      setRegisterUsername("");
      setRegisterPassword("");
    }
  };

  const handleSave = async () => {
    if (!saveName) return;
    try {
      await saveWorld(saveName, /* pass current objects */);
      alert("World saved!");
      setSaveName("");
      getUserWorlds().then(setUserWorlds);
    } catch (error) {
      alert("Save failed: " + error.message);
    }
  };

  const handleLoad = async () => {
    if (!loadId) return;
    const world = await loadWorld(loadId);
    if (world) {
      alert("World loaded!");
    }
  };

  const handleDownload = async () => {
    if (!loadId) return;
    await downloadWorld(loadId);
  };

  return (
    <>
      <div className={`menu__overlay ${!isOpen ? "menu__overlay--closing" : ""}`} onClick={handleClose} />
      <div className={`menu ${isOpen ? "menu_open" : ""}`}>
        <div className="menu__header">
          <h2>Menu</h2>
          <button className="menu_closed" onClick={handleClose}>✕</button>
        </div>

        {isGuest ? (
          <>
            <div className="menu__section">
              <h3>Login</h3>
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
            </div>

            <div className="menu__section">
              <h3>Register</h3>
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
            </div>
          </>
        ) : (
          <>
            <div className="menu__section">
              <p>Logged in as <strong>{username}</strong></p>
              <button className="menu__button menu__button--primary" onClick={logout}>
                Logout
              </button>
            </div>

            <div className="menu__section">
              <h3>Save World</h3>
              <input
                className="menu__button"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="World Name"
              />
              <button className="menu__button menu__button--primary" onClick={handleSave}>
                Save
              </button>
            </div>

            <div className="menu__section">
              <h3>Your Worlds</h3>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {userWorlds.map((world) => (
                  <li key={world.id} className="menu__section">
                    <strong>{world.name}</strong>
                    <button className="menu__button" onClick={() => setLoadId(world.id)}>
                      Load
                    </button>
                    <button className="menu__button" onClick={() => downloadWorld(world.id)}>
                      Download
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </>
  );
}