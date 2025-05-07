import React, { useState, useEffect, useRef } from "react";
import ScriptNameModal from "./ScriptNameModal";
import UnsavedChangesModal from "./UnsavedChangesModal";
import ExportModal from "./ExportModal";
import ImportModal from "./ImportModal";
import { Code, Play, Save, Trash2, Maximize, Download, Upload } from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { lintGutter } from "@codemirror/lint";
import { DEFAULT_SCRIPT_INPUT, defaultScriptsListHook } from "../utils";
import { useScriptsListHook } from "../useScriptsListHook";
import { useStorageHook } from "../useStorageHook";

export default function DebuggerPopup() {
  const [isActive, setIsActive] = useState(false);
  const [scriptInput, setScriptInput] = useState(DEFAULT_SCRIPT_INPUT);
  const [scriptsListHook, setScriptsListHook] = useState(defaultScriptsListHook);
  const [isMaximized, setIsMaximized] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready to inject");
  const [currentTab, setCurrentTab] = useState(null);
  const [executionLogs, setExecutionLogs] = useState([]);
  const [copyStatus, setCopyStatus] = useState("");

  // Modals state
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [isUnsavedChangesModalOpen, setIsUnsavedChangesModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Pending action for after confirmation
  const [pendingAction, setPendingAction] = useState(null);

  // State management for script selection
  const [isNewScript, setIsNewScript] = useState(true);
  const [hasModified, setHasModified] = useState(false);

  // For unsaved changes check
  const originalScriptInputRef = useRef(scriptInput);

  // Get current tab
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0) {
        setCurrentTab(tabs[0]);
      }
    });
  }, []);

  // Hook for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (scriptsListHook.selected === "new") {
          setIsNameModalOpen(true);
        } else {
          handleSaveScript();
        }
      }

      // Ctrl+Enter to run
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        injectScript();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [scriptInput, scriptsListHook]);

  // Monitor script changes to detect modifications
  useEffect(() => {
    if (scriptsListHook.selected === "new") {
      // For new scripts, check if they've added content
      setHasModified(scriptInput !== DEFAULT_SCRIPT_INPUT && scriptInput !== "// Enter your script here..." && scriptInput.trim() !== "");
    } else {
      // For existing scripts, compare with original content
      const checkModification = async () => {
        const hasChanges = await handleStorageDispatch("checkUnsavedChanges", scriptsListHook.selected, scriptInput);
        setHasModified(hasChanges);
      };

      checkModification();
    }
  }, [scriptInput, scriptsListHook.selected]);

  // Handle selection of a script from dropdown
  const handleScriptSelect = async (scriptValue) => {
    // Skip if selecting the same script
    if (scriptValue === scriptsListHook.selected) {
      return;
    }

    // Check for unsaved changes
    if (hasModified) {
      setPendingAction(() => () => {
        setScriptsListHook({ ...scriptsListHook, selected: scriptValue });

        if (scriptValue === "new") {
          setScriptInput(DEFAULT_SCRIPT_INPUT);
          setIsNewScript(true);
        } else {
          handleStorageDispatch("load", scriptValue);
          setIsNewScript(false);
        }
      });

      setIsUnsavedChangesModalOpen(true);
      return;
    }

    // If no unsaved changes, proceed with selection
    setScriptsListHook({ ...scriptsListHook, selected: scriptValue });

    if (scriptValue === "new") {
      setScriptInput(DEFAULT_SCRIPT_INPUT);
      setIsNewScript(true);
    } else {
      handleStorageDispatch("load", scriptValue);
      setIsNewScript(false);
    }
  };

  // Maximize window handler
  const handleMaximize = () => {
    // We'll update this to ensure it works as expected
    chrome.windows.create({
      url: chrome.runtime.getURL("popup/popup.html"),
      type: "popup",
      width: 800,
      height: 600,
    });
  };

  // Initialize storage hook
  const { handleStorageDispatch, isLoading, error } = useStorageHook({
    scriptInput,
    setScriptInput,
    scriptsListHook,
    setScriptsListHook,
  });

  // Get scripts list hook
  const { renderScriptsOptionsList } = useScriptsListHook({
    setScriptInput,
    scriptsListHook,
    setScriptsListHook,
    handleStorageDispatch,
    checkForUnsavedChanges,
  });

  // Check for unsaved changes
  async function checkForUnsavedChanges(newScriptValue) {
    const hasUnsavedChanges = await handleStorageDispatch("checkUnsavedChanges", scriptsListHook.selected, scriptInput);

    if (hasUnsavedChanges) {
      setPendingAction(() => () => {
        setScriptsListHook({ ...scriptsListHook, selected: newScriptValue });
        handleStorageDispatch("load", newScriptValue);
      });
      setIsUnsavedChangesModalOpen(true);
      return true;
    }

    return false;
  }

  // Save script handler - shows name prompt for new scripts
  const handleSaveScript = async () => {
    if (scriptsListHook.selected === "new" || isNewScript) {
      setIsNameModalOpen(true);
      return;
    }

    // For existing scripts, just save
    await handleStorageDispatch("save");
    setHasModified(false);
    setStatusMessage("Script saved successfully");
  };
  // Inject script handler
  const injectScript = () => {
    if (!currentTab) {
      setStatusMessage("No active tab");
      return;
    }

    setStatusMessage("Injecting script...");

    chrome.tabs.sendMessage(
      currentTab.id,
      {
        action: "injectScript",
        scriptContent: scriptInput,
      },
      function (response) {
        if (chrome.runtime.lastError) {
          setStatusMessage(`Error: ${chrome.runtime.lastError.message}`);
          return;
        }

        if (response && response.success) {
          setStatusMessage("Script executed successfully");

          // If there were results, update the status with more details
          if (response.results && response.results.length > 0) {
            const result = response.results[0].result;

            if (result && result.logs) {
              setExecutionLogs(result.logs);
            }

            if (result && result.error) {
              setStatusMessage(`Error executing script: ${result.error}`);
              // Add the error to the logs as well
              setExecutionLogs((prev) => [...prev, { type: "error", content: [result.error] }]);
            }
          }
        } else if (response && response.error) {
          setStatusMessage(`Error: ${response.error}`);
        } else {
          setStatusMessage("Failed to inject script");
        }
      }
    );
  };

  // Copy to clipboard handler
  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(scriptInput)
      .then(() => {
        setCopyStatus("Copied!");
        setTimeout(() => setCopyStatus(""), 2000);
      })
      .catch((err) => {
        setCopyStatus("Failed to copy");
        console.error("Could not copy text: ", err);
      });
  };

  // Format code handler
  const formatCode = () => {
    try {
      // Use Prettier if available (would need to be added to deps)
      // For now, let's use a simple formatting approach
      const formattedCode = scriptInput.replace(/{\s*\n/g, "{\n").replace(/\n\s*}/g, "\n}");

      setScriptInput(formattedCode);
      setStatusMessage("Code formatted");
    } catch (error) {
      console.error("Error formatting code:", error);
      setStatusMessage("Error formatting code");
    }
  };

  // Export scripts handler
  const handleExportScripts = () => {
    setIsExportModalOpen(true);
  };

  // Import scripts handler
  const handleImportScripts = () => {
    setIsImportModalOpen(true);
  };

  // Make sure the handleDeleteScript function is defined in the component
  const handleDeleteScript = async () => {
    if (scriptsListHook.selected === "new") {
      setStatusMessage("Cannot delete a new script");
      return;
    }

    try {
      await handleStorageDispatch("delete", scriptsListHook.selected);
      setStatusMessage("Script deleted successfully");
    } catch (error) {
      console.error("Error deleting script:", error);
      setStatusMessage(`Error deleting script: ${error.message}`);
    }
  };

  // Status indicator component
  const StatusIndicator = ({ status }) => {
    let bgColor = "bg-gray-500";
    let statusText = status || "Ready";

    if (status && status.includes("success")) {
      bgColor = "bg-green-500";
    } else if ((status && status.includes("Error")) || (status && status.includes("Failed"))) {
      bgColor = "bg-red-500";
    } else if (status && status.includes("Injecting")) {
      bgColor = "bg-yellow-500";
    }

    return (
      <div className="flex items-center mt-4">
        <div className={`w-2 h-2 rounded-full ${bgColor} mr-2`}></div>
        <div className="text-xs text-gray-400">{statusText}</div>
      </div>
    );
  };

  // Save with name handler
  const saveWithName = async (name) => {
    try {
      const scriptId = await handleStorageDispatch("save", null, name);

      if (scriptId) {
        // Update selection to the newly saved script
        setScriptsListHook((prev) => ({
          ...prev,
          selected: scriptId,
        }));

        setIsNewScript(false);
        setHasModified(false);
        setStatusMessage(`Script "${name}" saved successfully`);
      } else {
        setStatusMessage("Failed to save script");
      }
    } catch (error) {
      console.error("Error saving script:", error);
      setStatusMessage("Error saving script");
    }

    setIsNameModalOpen(false);
  };

  // Handle unsaved changes confirmation
  const handleUnsavedChangesConfirm = async (shouldSave) => {
    setIsUnsavedChangesModalOpen(false);

    if (shouldSave) {
      // If it's a new script, we need to prompt for a name
      if (scriptsListHook.selected === "new") {
        setIsNameModalOpen(true);
        // We'll execute the pending action after the name is provided
        return;
      }

      // Otherwise, save the current script
      await handleSaveScript();
    }

    // Execute the pending action (usually switching to another script)
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  // After saving a new script with a name, execute any pending action
  useEffect(() => {
    if (!isNameModalOpen && pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  }, [isNameModalOpen, pendingAction]);

  return (
    <div className="w-full min-h-[500px] bg-gray-900 text-gray-100 p-4 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Code className="h-5 w-5 text-purple-400" />
          <h1 className="text-lg font-bold text-purple-400">Script Debug</h1>
        </div>
        <div className="flex space-x-2">
          <button onClick={formatCode} className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-500">
            Format
          </button>
          <button onClick={handleExportScripts} className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 flex items-center">
            <Download className="h-4 w-4 mr-1" />
            Export
          </button>
          <button onClick={handleImportScripts} className="px-3 py-1 rounded bg-green-600 hover:bg-green-500 flex items-center">
            <Upload className="h-4 w-4 mr-1" />
            Import
          </button>
        </div>
      </div>

      {/* Scripts list */}
      {renderScriptsOptionsList(hasModified)}

      {/* Quick Actions */}
      <div className="flex space-x-2 mb-4">
        <button className="flex-1 flex items-center justify-center space-x-1 bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded" onClick={injectScript}>
          <Play className="h-4 w-4" />
          <span>Run Script</span>
        </button>
        <button className="flex-1 flex items-center justify-center space-x-1 bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded" onClick={handleSaveScript}>
          <Save className="h-4 w-4" />
          <span>Save</span>
        </button>
        <button className="flex items-center justify-center bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded text-sm" onClick={copyToClipboard}>
          {copyStatus || "Copy"}
        </button>
        <button className="flex items-center justify-center bg-red-600 hover:bg-red-700 px-3 py-2 rounded" onClick={handleDeleteScript}>
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Script Editor */}
      <div className="relative">
        <div className={`relative w-full transition-all duration-200 ${isMaximized ? "fixed top-0 left-0 right-0 bottom-0 z-50 bg-gray-900 p-4" : ""}`}>
          <div className="flex justify-end mb-2">
            <button onClick={handleMaximize} className="bg-purple-600 hover:bg-purple-700 p-1 rounded flex items-center">
              <Maximize className="h-4 w-4 mr-1" />
              {isMaximized ? "Minimize" : "Maximize"}
            </button>
          </div>
          <CodeMirror
            value={scriptInput}
            height="400px"
            theme={oneDark}
            extensions={[javascript({ jsx: true }), lintGutter()]}
            onChange={(val) => setScriptInput(val)}
            basicSetup={{
              lineNumbers: true,
              highlightActiveLineGutter: true,
              highlightSpecialChars: true,
              history: true,
              foldGutter: true,
              drawSelection: true,
              dropCursor: true,
              allowMultipleSelections: true,
              indentOnInput: true,
              syntaxHighlighting: true,
              bracketMatching: true,
              closeBrackets: true,
              autocompletion: true,
              rectangularSelection: true,
              crosshairCursor: true,
              highlightActiveLine: true,
              highlightSelectionMatches: true,
              closeBracketsKeymap: true,
              defaultKeymap: true,
              searchKeymap: true,
              historyKeymap: true,
              foldKeymap: true,
              completionKeymap: true,
              lintKeymap: true,
            }}
          />
        </div>
      </div>

      {/* Execution Logs */}
      <div className="mt-4">
        <h3 className="text-sm font-medium text-gray-300 mb-2">Execution Logs</h3>
        <div className="bg-gray-800 rounded p-2 max-h-32 overflow-y-auto">
          {executionLogs.length === 0 ? (
            <div className="text-gray-500 text-xs italic">No logs available</div>
          ) : (
            executionLogs.map((log, index) => (
              <div key={index} className={`text-xs mb-1 ${log.type === "error" ? "text-red-400" : log.type === "warn" ? "text-yellow-400" : "text-gray-300"}`}>
                {log.content.map((item) => (typeof item === "object" ? JSON.stringify(item) : String(item))).join(" ")}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Status */}
      <StatusIndicator status={statusMessage} />
      <div className="text-xs text-gray-500 mt-2">Tip: Use Ctrl+S to save and Ctrl+Enter to run</div>

      {/* Modals */}
      <ScriptNameModal isOpen={isNameModalOpen} onClose={() => setIsNameModalOpen(false)} onSave={saveWithName} />

      <UnsavedChangesModal isOpen={isUnsavedChangesModalOpen} onClose={() => setIsUnsavedChangesModalOpen(false)} onConfirm={handleUnsavedChangesConfirm} />

      <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} scripts={scriptsListHook.options} onExport={(scriptIds) => handleStorageDispatch("export", scriptIds)} />

      <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImport={(csvContent) => handleStorageDispatch("import", csvContent)} />
    </div>
  );
}
