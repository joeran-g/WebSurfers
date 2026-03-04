import { useState, useEffect } from "react";
import Header from "../components/Header";
import Game from "../components/Game";
import Menu from "../components/Menu";
import "./styles/App.css";

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <div className="app">
      <Header
        onMenuClick={() => setMenuOpen(true)}
        onThemeToggle={toggleTheme}
        theme={theme}
      />
      <Game />
      {menuOpen && <Menu onClose={() => setMenuOpen(false)} />}
    </div>
  );
}