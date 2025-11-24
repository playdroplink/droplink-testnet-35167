import React, { useState } from "react";

const ThemeCustomizer: React.FC = () => {
  const [theme, setTheme] = useState({
    background: "#f5f5f5",
    text: "#222222",
  });

  // TODO: Save theme to backend or context

  return (
    <div className="bg-white p-6 rounded shadow max-w-xl mx-auto mt-8">
      <h2 className="text-xl font-bold mb-2">Theme & Background</h2>
      <div className="mb-4">
        <label className="block mb-1">Background Color</label>
        <input
          type="color"
          value={theme.background}
          onChange={e => setTheme({ ...theme, background: e.target.value })}
          className="w-16 h-8 border rounded"
        />
      </div>
      <div className="mb-4">
        <label className="block mb-1">Text Color</label>
        <input
          type="color"
          value={theme.text}
          onChange={e => setTheme({ ...theme, text: e.target.value })}
          className="w-16 h-8 border rounded"
        />
      </div>
      <div className="p-4 rounded" style={{ background: theme.background, color: theme.text }}>
        <p>Preview: This is your store's theme!</p>
      </div>
    </div>
  );
};

export default ThemeCustomizer;
