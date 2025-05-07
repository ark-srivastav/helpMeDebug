import React, { useEffect } from "react";
import { DEFAULT_SCRIPT_INPUT, sampleScripts } from "./utils";

const useScriptsListHook = ({
  setScriptInput,
  scriptsListHook,
  setScriptsListHook,
  handleStorageDispatch
}) => {
  // Initialize on component mount
  useEffect(() => {
    handleStorageDispatch('initiate');
  }, []);

  const handleScriptSelect = (scriptValue) => {
    console.log("🐠🐠🐠", {scriptValue})
    console.log("🍉🍉🍉", { ...scriptsListHook, selected: scriptValue })
    setScriptsListHook({ ...scriptsListHook, selected: scriptValue });

    // Special case for "new script" option
    if (scriptValue === 'new') {
      setScriptInput('// Enter your new script here...');
    } else {
      handleStorageDispatch('load', scriptValue);
    }
  };

  const renderScriptsOptionsList = () => {
    return (
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm text-gray-400">Select Script</label>
          <button
            onClick={() => handleScriptSelect('new')}
            className="text-xs bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded"
          >
            New Script
          </button>
        </div>
        <select
          value={scriptsListHook.selected}
          onChange={(e) => handleScriptSelect(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
        >
          <option value="new">-- New Script --</option>
          {scriptsListHook.options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  };

  return {
    renderScriptsOptionsList
  };
};

export { useScriptsListHook };