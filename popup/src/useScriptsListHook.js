import React, { useState, useEffect, useCallback, useMemo } from "react";
import { DEFAULT_SCRIPT_INPUT, sampleScripts, SCRIPT_STORAGE_KEY, defaultScriptsListHook } from "./utils";

/**
 * 
 * @param {Object} hookParam 
 * @param {Function} hookParam.setScriptInput
 * @param {Object} hookParam.setScriptInput
 * @param {Function} hookParam.setScriptsListHook
 * @returns 
 */
const useScriptsListHook = ({
  setScriptInput = () => {},

  scriptsListHook,
  setScriptsListHook = () => {},

  handleStorageDispatch = () => {}
}) => {


  useEffect(() => {
    handleStorageDispatch()
  }, [])

  const loadSavedScripts = () => {
    console.log({ chrome })
    try {
      chrome.storage.local.get([SCRIPT_STORAGE_KEY], (result) => {
        console.log({ result })
        if (result.savedScripts) {
          // setSavedScripts(result.savedScripts);
          // If we have scripts, select the first one
          console.log({result})
          const scriptNames = Object.keys(result.savedScripts);
          if (scriptNames.length > 0) {
            // setCurrentScriptName(scriptNames[0]);
            // setScriptSelectionHook(() => ({ ...scriptSelectionHook, selectedScript: scriptSelectionHook.options[0].value }))
            // setScriptInput(result.savedScripts[scriptNames[0]].content);
          }
        }
      });
    } catch (err) {
      console.log({ err })
      setScriptsListHook(() => (defaultScriptsListHook))
    }
  };


  const handleScriptSelect = (scriptVal) => {
    console.log({ scriptVal })
    setScriptInput(DEFAULT_SCRIPT_INPUT)
    setScriptsListHook(() => ({ ...scriptsListHook, selected: scriptVal }))
  }

  const getOptions = () => {
    return scriptsListHook.options.map(scriptOption => <option key={`option-key-${scriptOption.value}`} value={scriptOption.value}>{scriptOption.label}</option>)
  }

  const renderScriptsOptionsList = () => {
    return <div className="mb-4">
      <select
        value={scriptsListHook.selected}
        onChange={(e) => handleScriptSelect(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
      >
        {getOptions()}
      </select>
    </div>
  }

  return {
    renderScriptsOptionsList
  }
}

export {
  useScriptsListHook
}