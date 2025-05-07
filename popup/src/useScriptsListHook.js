// popup/src/useScriptsListHook.js
import React, { useEffect } from "react";
import { DEFAULT_SCRIPT_INPUT } from "./utils";

const useScriptsListHook = ({
  setScriptInput,
  scriptsListHook,
  setScriptsListHook,
  handleStorageDispatch,
  checkForUnsavedChanges
}) => {
  // Initialize on component mount
  useEffect(() => {
    handleStorageDispatch('initiate');
  }, []);

  // Handle script selection with unsaved changes check
  const handleScriptSelect = async (scriptValue) => {
    // Skip if selecting the same script
    if (scriptValue === scriptsListHook.selected) {
      return;
    }

    // Check for unsaved changes in current script
    const hasUnsavedChanges = await checkForUnsavedChanges(scriptValue);

    if (!hasUnsavedChanges) {
      // If no unsaved changes, proceed with selection
      setScriptsListHook({ ...scriptsListHook, selected: scriptValue });

      // Special case for "new script" option
      if (scriptValue === 'new') {
        setScriptInput('// Enter your script here...');
      } else {
        handleStorageDispatch('load', scriptValue);
      }
    }
    // If there are unsaved changes, the confirmation modal will handle it
  };

  // Render the scripts dropdown list
  const renderScriptsOptionsList = (hasModified) => {
    return (
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm text-gray-400">Script</label>
          <div className="flex items-center space-x-2">
            {hasModified && (
              <span className="text-xs text-yellow-400">• Unsaved changes</span>
            )}
            <button
              onClick={() => handleScriptSelect('new')}
              className="text-xs bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded"
            >
              New Script
            </button>
          </div>
        </div>
        <select
          value={scriptsListHook.selected || 'new'}
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
    renderScriptsOptionsList,
    handleScriptSelect
  };
};

export { useScriptsListHook };