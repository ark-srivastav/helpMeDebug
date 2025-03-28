import React, { useState, useEffect } from "react";
import { Code, Play, Save, Trash2, RefreshCw } from "lucide-react";
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
  const [targetUrl, setTargetUrl] = useState("");
  const [overrideEnabled, setOverrideEnabled] = useState(true);
  const [currentTab, setCurrentTab] = useState(null);

  // In DebuggerPopup.jsx, add a new state for script name
  const [scriptName, setScriptName] = useState("");

  const [executionLogs, setExecutionLogs] = useState([]);

  const [copyStatus, setCopyStatus] = useState("");

  // Get current tab info when popup opens
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        setCurrentTab(tabs[0]);

        // Check if override is enabled for this tab
        chrome.tabs.sendMessage(tabs[0].id, { action: "getOverrideStatus" }, (response) => {
          if (response && response.enabled) {
            setOverrideEnabled(response.enabled);
            setTargetUrl(response.targetUrl || "");
          }
        });
      }
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+S to save
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        handleSaveScript();
      }

      // Ctrl+Enter to run
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        injectScript();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleSaveScript, injectScript]);

  const handleMaximize = () => {
    chrome.windows.create({
      url: chrome.runtime.getURL("popup/popup.html"),
      type: "popup",
      width: 800,
      height: 600,
    });
  };

  const { handleStorageDispatch } = useStorageHook({
    scriptInput,
    setScriptInput,
    scriptsListHook,
    setScriptsListHook,
  });

  const { renderScriptsOptionsList } = useScriptsListHook({
    setScriptInput,
    scriptsListHook,
    setScriptsListHook,
    handleStorageDispatch,
  });

  // Update handleSaveScript to pass the script name
  const handleSaveScript = () => {
    handleStorageDispatch("save", null, scriptName);
    setStatusMessage("Script saved successfully");
  };

  const handleDeleteScript = () => {
    if (scriptsListHook.selected === "new") {
      setStatusMessage("Cannot delete a new script");
      return;
    }

    handleStorageDispatch("delete", scriptsListHook.selected);
    setStatusMessage("Script deleted successfully");
  };

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
  const toggleScriptOverride = () => {
    if (!currentTab) {
      setStatusMessage("No active tab");
      return;
    }

    const newOverrideState = !overrideEnabled;
    setOverrideEnabled(newOverrideState);

    chrome.tabs.sendMessage(
      currentTab.id,
      {
        action: "toggleScriptOverride",
        enabled: newOverrideState,
        targetUrl: targetUrl,
        scriptContent: scriptInput,
      },
      function (response) {
        if (chrome.runtime.lastError) {
          setStatusMessage(`Error: ${chrome.runtime.lastError.message}`);
        } else if (response && response.success) {
          setStatusMessage(newOverrideState ? `Override enabled for: ${targetUrl}` : "Override disabled");
        } else {
          setStatusMessage("Failed to toggle override");
        }
      }
    );
  };

  const extractScriptUrlFromPage = () => {
    if (!currentTab) {
      setStatusMessage("No active tab");
      return;
    }

    chrome.tabs.sendMessage(
      currentTab.id,
      {
        action: "getPageScripts",
      },
      function (response) {
        if (chrome.runtime.lastError) {
          setStatusMessage(`Error: ${chrome.runtime.lastError.message}`);
        } else if (response && response.scripts && response.scripts.length > 0) {
          // Show a simple dropdown for script selection
          const scriptUrl = prompt("Select a script URL to override (or enter a pattern):", response.scripts.join("\n"));

          if (scriptUrl) {
            setTargetUrl(scriptUrl.trim());
            setStatusMessage(`Target set to: ${scriptUrl.trim()}`);
          }
        } else {
          setStatusMessage("No scripts found on page");
        }
      }
    );
  };

  // Add this function in DebuggerPopup.jsx
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

  return (
    <div className="w-[600px] min-h-[500px] bg-gray-900 text-gray-100 p-4 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Code className="h-5 w-5 text-purple-400" />
          <h1 className="text-lg font-bold text-purple-400">Script Debug</h1>
        </div>
        <button onClick={toggleScriptOverride} className={`px-3 py-1 rounded ${overrideEnabled ? "bg-purple-600" : "bg-gray-700"} hover:bg-purple-500`}>
          {overrideEnabled ? "Override Active" : "Override Inactive"}
        </button>
      </div>
      {renderScriptsOptionsList()}
      {/* Script URL Target Field */}
      <div className="mb-4">
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Script URL to override (e.g., example.com/script.js)"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
          <button onClick={extractScriptUrlFromPage} className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded" title="Find scripts on this page">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-1">Enter the URL or domain of the script you want to override</div>
      </div>
      {/* Quick Actions */}
      <div className="flex space-x-2 mb-4">
        <button className="flex-1 flex items-center justify-center space-x-1 bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded" onClick={injectScript}>
          <Play className="h-4 w-4" />
          <span>Inject Once</span>
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
      <div className="mb-4">
        <label className="text-sm text-gray-400 block mb-1">Script Name</label>
        <input
          type="text"
          placeholder="Enter a name for this script"
          value={scriptName}
          onChange={(e) => setScriptName(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
        />
      </div>
      {/* Script Editor */}
      <div className="relative">
        <div className={`relative w-full transition-all duration-200 ${isMaximized ? "fixed top-0 left-0 right-0 bottom-0 z-50 bg-gray-900 p-4" : ""}`}>
          <div className="flex justify-end mb-2">
            <button onClick={handleMaximize} className="bg-purple-600 hover:bg-purple-700 p-1 rounded">
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
    </div>
  );
}
