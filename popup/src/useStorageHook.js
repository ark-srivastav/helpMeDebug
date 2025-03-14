import React, { useState, useEffect, useCallback, useMemo } from "react";
import { defaultScriptsListHook, SCRIPT_STORAGE_KEY } from "./utils";

/**
 * 
 * @param {Object} storageHookParam 
 * @param {String} storageHookParam.scriptInput
 * @param {@type {import('./types').ScriptsList}} storageHookParam.scriptInputListHook
 * @returns 
 */
const useStorageHook = ({
  scriptInput,
  setScriptInput,

  scriptInputListHook,

  setScriptsListHook = () => {},
}) => {

  const initializeScriptsList = () => {
    try {

      chrome.storage.local.get([SCRIPT_STORAGE_KEY], (savedScripts) => {
        console.log({savedScripts})

        // 
        if (savedScripts && Object.keys(savedScripts).length) {
          const targetScripts = savedScripts
          setScriptsListHook(() => ({
            options: targetScripts,
            selected: targetScripts[0].value
          }))
        } else {
          setScriptsListHook(defaultScriptsListHook)
        }
      })

    } catch (err) {
      console.log({ "initializeScriptsList": err })
      setScriptsListHook(() => (defaultScriptsListHook))
    }
  }

  const saveScript = () => {


    const scriptData = {
      content: scriptInput,
      lastModified: Date.now(),
      label: `Label - ${Date.now()}`,
      value: `value - ${Date.now()}`,
      description: "Some yummy dummy description", // We can add description input later
    };

    const updatedScripts = {
      ...scriptInputListHook.options,
      [scriptSelectionHook.selectedScript]: scriptData,
    };

    chrome.storage.local.set(
      {
        savedScripts: updatedScripts,
      },
      () => {
        setScriptInput(updatedScripts);
        // Show success notification
      }
    );

  }

  /**
   * 
   * @param {String} scriptName 
   */
  const getScript = (scriptName) => {
    try {
      chrome.storage.local.get([SCRIPT_STORAGE_KEY], (result) => {
        console.log({ result })
        if (result.savedScripts) {
          // setSavedScripts(result.savedScripts);
          // If we have scripts, select the first one
          console.log({ result })
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
  }

  /**
   * 
   * @param {'save' | 'delete' | 'get' | 'initiate'} mode 
   * @param {String} scriptName
   */
  const handleStorageDispatch = (mode = 'initiate', scriptName = null) => {
    if (mode == 'initiate') {
      initializeScriptsList()
    } else if (mode == "save") {
      saveScript()
    }
  }


  return {
    handleStorageDispatch
  }
}

export {
  useStorageHook
}