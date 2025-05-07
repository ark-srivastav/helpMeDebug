// popup/src/useStorageHook.js
import React, { useState, useEffect } from "react";
import { defaultScriptsListHook } from "./utils";
import * as storageService from "../../scripts/storageService";

export const useStorageHook = ({
  scriptInput,
  setScriptInput,
  scriptsListHook,
  setScriptsListHook,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // In your useStorageHook.js, update the script list initialization:

  const initializeScriptsList = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const savedScripts = await storageService.getAllScripts();

      if (savedScripts && savedScripts.length > 0) {
        // Convert saved scripts to the format needed for dropdown
        const scriptOptions = savedScripts.map(script => ({
          label: script.name || `Script ${new Date(script.lastModified).toLocaleString()}`,
          value: script.id
        }));

        setScriptsListHook({
          options: scriptOptions,
          selected: scriptOptions[0].value
        });

        // Load the content of the selected script
        setScriptInput(savedScripts[0].content);
      } else {
        setScriptsListHook({
          options: [],
          selected: 'new'
        });
        setScriptInput(DEFAULT_SCRIPT_INPUT);
      }
    } catch (err) {
      console.error("Error initializing scripts list:", err);
      setError(`Failed to load scripts: ${err.message}`);
      setScriptsListHook({
        options: [],
        selected: 'new'
      });
      setScriptInput(DEFAULT_SCRIPT_INPUT);
    } finally {
      setIsLoading(false);
    }
  };

  // Fixed saveScript function that preserves existing script names

  const saveScript = async (customName) => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if we're saving a new script or updating an existing one
      const isNewScript = scriptsListHook.selected === 'new' || !scriptsListHook.selected;

      // If updating an existing script, get its current data first
      let existingScript = null;
      if (!isNewScript) {
        existingScript = await storageService.getScript(scriptsListHook.selected);
      }

      // Create a unique key if creating a new script
      const scriptKey = isNewScript
        ? `script_${Date.now()}`
        : scriptsListHook.selected;

      // Handle the script name based on context:
      // 1. For new scripts, use the custom name if provided, otherwise generate a name
      // 2. For existing scripts, keep the existing name unless a new name is explicitly provided
      let scriptName;

      if (isNewScript) {
        // New script - use custom name or generate one
        scriptName = customName && customName.trim() !== ""
          ? customName.trim()
          : `Script ${new Date().toLocaleString()}`;
      } else {
        // Existing script - keep its name unless explicitly changing it
        scriptName = customName && customName.trim() !== ""
          ? customName.trim()
          : (existingScript?.name || `Script ${new Date().toLocaleString()}`);
      }

      // Prepare script data
      const scriptData = {
        id: scriptKey,
        name: scriptName,
        content: scriptInput,
        lastModified: Date.now(),
        description: existingScript?.description || "Custom debugging script"
      };

      // Save to IndexedDB
      await storageService.saveScript(scriptData);

      // Get all scripts to update the list
      const allScripts = await storageService.getAllScripts();
      const scriptOptions = allScripts.map(script => ({
        label: script.name || `Script ${new Date(script.lastModified).toLocaleString()}`,
        value: script.id
      }));

      // Update the script list with the new script
      if (isNewScript) {
        setScriptsListHook({
          options: scriptOptions,
          selected: scriptKey
        });
      } else {
        setScriptsListHook({
          options: scriptOptions,
          selected: scriptsListHook.selected
        });
      }

      console.log("Script saved successfully");
      setStatusMessage("Script saved successfully");
      return scriptKey;
    } catch (err) {
      console.error("Error saving script:", err);
      setError(`Failed to save script: ${err.message}`);
      setStatusMessage(`Failed to save script: ${err.message}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Load a script from IndexedDB
  const loadScript = async (scriptKey) => {
    if (!scriptKey || scriptKey === 'new') {
      setScriptInput('// Enter your script here...');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const script = await storageService.getScript(scriptKey);

      if (script) {
        setScriptInput(script.content);
      } else {
        console.warn(`Script with key ${scriptKey} not found`);
        setScriptInput('// Script not found');
      }
    } catch (err) {
      console.error("Error loading script:", err);
      setError(`Failed to load script: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a script from IndexedDB
  const deleteScript = async (scriptKey) => {
    if (!scriptKey || scriptKey === 'new') return;

    setIsLoading(true);
    setError(null);

    try {
      await storageService.deleteScript(scriptKey);

      // Get updated scripts list
      const savedScripts = await storageService.getAllScripts();

      // Update the scripts list without the deleted script
      if (savedScripts && savedScripts.length > 0) {
        const scriptOptions = savedScripts.map(script => ({
          label: script.name || `Script ${new Date(script.lastModified).toLocaleString()}`,
          value: script.id
        }));

        const newSelected = scriptOptions.length > 0 ? scriptOptions[0].value : 'new';

        setScriptsListHook({
          options: scriptOptions,
          selected: newSelected
        });

        // Load the new selected script or default
        if (newSelected !== 'new') {
          loadScript(newSelected);
        } else {
          setScriptInput('// Enter your script here...');
        }
      } else {
        setScriptsListHook({
          options: [],
          selected: 'new'
        });
        setScriptInput('// Enter your script here...');
      }

      console.log("Script deleted successfully");
    } catch (err) {
      console.error("Error deleting script:", err);
      setError(`Failed to delete script: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if the current script has unsaved changes
  const checkUnsavedChanges = async (scriptKey, currentContent) => {
    try {
      return await storageService.hasUnsavedChanges(scriptKey, currentContent);
    } catch (err) {
      console.error("Error checking unsaved changes:", err);
      // In case of error, assume there are unsaved changes to be safe
      return true;
    }
  };

  // Export scripts to CSV
  const exportScripts = async (scriptIds = []) => {
    setIsLoading(true);
    setError(null);

    try {
      const csvContent = await storageService.exportScriptsToCSV(scriptIds);

      // Create a Blob and download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      // Create and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `script-debugger-export-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return true;
    } catch (err) {
      console.error("Error exporting scripts:", err);
      setError(`Failed to export scripts: ${err.message}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Import scripts from CSV
  const importScripts = async (csvContent) => {
    setIsLoading(true);
    setError(null);

    try {
      const importedIds = await storageService.importScriptsFromCSV(csvContent);

      // Refresh the scripts list
      await initializeScriptsList();

      return importedIds;
    } catch (err) {
      console.error("Error importing scripts:", err);
      setError(`Failed to import scripts: ${err.message}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Dispatch action handler
  const handleStorageDispatch = async (action = 'initiate', scriptKey, scriptName) => {
    switch (action) {
      case 'initiate':
        await initializeScriptsList();
        break;
      case 'save':
        return await saveScript(scriptName);
      case 'load':
        await loadScript(scriptKey);
        break;
      case 'delete':
        await deleteScript(scriptKey);
        break;
      case 'checkUnsavedChanges':
        return await checkUnsavedChanges(scriptKey, scriptInput);
      case 'export':
        return await exportScripts(scriptKey); // scriptKey is actually scriptIds array here
      case 'import':
        return await importScripts(scriptKey); // scriptKey is actually csvContent here
      default:
        console.warn("Unknown storage action:", action);
    }
  };

  return {
    handleStorageDispatch,
    isLoading,
    error
  };
};

/**
 * Validates a script name
 * @param {string} name - The name to validate
 * @returns {Object} Validation result with boolean and message
 */
export const validateScriptName = (name) => {
  if (!name || name.trim() === '') {
    return {
      isValid: false,
      message: 'Script name cannot be empty'
    };
  }

  if (name.length > 100) {
    return {
      isValid: false,
      message: 'Script name is too long (maximum 100 characters)'
    };
  }

  // Disallow special characters that might cause issues
  const invalidCharsRegex = /[<>:"/\\|?*]/;
  if (invalidCharsRegex.test(name)) {
    return {
      isValid: false,
      message: 'Script name contains invalid characters (< > : " / \\ | ? *)'
    };
  }

  return {
    isValid: true,
    message: ''
  };
};


/**
 * Generates a default script name if none is provided
 * @returns {string} A generated script name
 */
export const generateDefaultScriptName = () => {
  const now = new Date();
  const formattedDate = now.toLocaleDateString();
  const formattedTime = now.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  });

  return `Script ${formattedDate} ${formattedTime}`;
};

/**
 * Updates the script selection in the dropdown list
 * @param {Object} scriptData - The newly saved script data 
 * @param {Function} setScriptsListHook - State setter for the scripts list
 */
export const updateScriptSelection = (scriptData, setScriptsListHook) => {
  setScriptsListHook(prevState => {
    // Check if script already exists in the list
    const scriptExists = prevState.options.some(
      option => option.value === scriptData.id
    );

    if (scriptExists) {
      // Update existing script
      const updatedOptions = prevState.options.map(option => {
        if (option.value === scriptData.id) {
          return {
            ...option,
            label: scriptData.name
          };
        }
        return option;
      });

      return {
        options: updatedOptions,
        selected: scriptData.id
      };
    } else {
      // Add new script
      const newOption = {
        label: scriptData.name,
        value: scriptData.id
      };

      return {
        options: [...prevState.options, newOption],
        selected: scriptData.id
      };
    }
  });
};