import React from "react";
import { defaultScriptsListHook, SCRIPT_STORAGE_KEY } from "./utils";

const useStorageHook = ({
  scriptInput,
  setScriptInput,
  scriptsListHook,  // Fixed parameter name
  setScriptsListHook = () => { },
}) => {

  const initializeScriptsList = () => {
    try {
      chrome.storage.local.get([SCRIPT_STORAGE_KEY], (result) => {
        if (result && result[SCRIPT_STORAGE_KEY]) {
          const savedScripts = result[SCRIPT_STORAGE_KEY];
          // Convert saved scripts to the format needed for dropdown
          const scriptOptions = Object.keys(savedScripts).map(key => ({
            label: savedScripts[key].label || key,
            value: key
          }));

          if (scriptOptions.length > 0) {
            setScriptsListHook({
              options: scriptOptions,
              selected: scriptOptions[0].value
            });

            // Load the content of the selected script
            setScriptInput(savedScripts[scriptOptions[0].value].content);
          } else {
            setScriptsListHook(defaultScriptsListHook);
          }
        } else {
          setScriptsListHook(defaultScriptsListHook);
        }
      });
    } catch (err) {
      console.error("Error initializing scripts list:", err);
      setScriptsListHook(defaultScriptsListHook);
    }
  };
  // In useStorageHook.js, modify the saveScript function to accept a script name
  const saveScript = (customName) => {
    // Create a unique key if creating a new script
    const scriptKey = scriptsListHook.selected === 'new'
      ? `script_${Date.now()}`
      : scriptsListHook.selected;

    // Use custom name if provided, otherwise use a generated name
    const scriptName = customName && customName.trim() !== ""
      ? customName.trim()
      : `Script ${new Date().toLocaleString()}`;

    chrome.storage.local.get([SCRIPT_STORAGE_KEY], (result) => {
      const savedScripts = result[SCRIPT_STORAGE_KEY] || {};

      const scriptData = {
        content: scriptInput,
        lastModified: Date.now(),
        label: scriptName,
        description: "Custom debugging script",
      };

      const updatedScripts = {
        ...savedScripts,
        [scriptKey]: scriptData,
      };

      const storageObj = {};
      storageObj[SCRIPT_STORAGE_KEY] = updatedScripts;

      chrome.storage.local.set(storageObj, () => {
        // Update the script list with the new script
        const newOption = { label: scriptName, value: scriptKey };

        if (scriptsListHook.selected === 'new') {
          setScriptsListHook({
            options: [...scriptsListHook.options, newOption],
            selected: scriptKey
          });
        }

        console.log("Script saved successfully");
      });
    });
  };

  const loadScript = (scriptKey) => {
    if (!scriptKey || scriptKey === 'new') {
      setScriptInput('// Enter your script here...');
      return;
    }

    chrome.storage.local.get([SCRIPT_STORAGE_KEY], (result) => {
      if (result && result[SCRIPT_STORAGE_KEY] && result[SCRIPT_STORAGE_KEY][scriptKey]) {
        setScriptInput(result[SCRIPT_STORAGE_KEY][scriptKey].content);
      }
    });
  };

  const deleteScript = (scriptKey) => {
    if (!scriptKey || scriptKey === 'new') return;

    chrome.storage.local.get([SCRIPT_STORAGE_KEY], (result) => {
      if (result && result[SCRIPT_STORAGE_KEY]) {
        const savedScripts = result[SCRIPT_STORAGE_KEY];
        const { [scriptKey]: removed, ...updatedScripts } = savedScripts;

        const storageObj = {};
        storageObj[SCRIPT_STORAGE_KEY] = updatedScripts;

        chrome.storage.local.set(storageObj, () => {
          // Update the scripts list without the deleted script
          const newOptions = scriptsListHook.options.filter(opt => opt.value !== scriptKey);
          const newSelected = newOptions.length > 0 ? newOptions[0].value : 'new';

          setScriptsListHook({
            options: newOptions,
            selected: newSelected
          });

          // Load the new selected script or default
          loadScript(newSelected);

          console.log("Script deleted successfully");
        });
      }
    });
  };

  // Update the handleStorageDispatch to accept the script name parameter
  const handleStorageDispatch = (action = 'initiate', scriptKey, scriptName) => {
    switch (action) {
      case 'initiate':
        initializeScriptsList();
        break;
      case 'save':
        saveScript(scriptName);
        break;
      case 'load':
        loadScript(scriptKey);
        break;
      case 'delete':
        deleteScript(scriptKey);
        break;
      default:
        console.warn("Unknown storage action:", action);
    }
  };

  return {
    handleStorageDispatch
  };
};

export { useStorageHook };