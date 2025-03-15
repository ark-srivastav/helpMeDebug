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

  const handleSaveScript = () => {
    handleStorageDispatch('save');
    setStatusMessage("Script saved successfully");
  };

  const handleDeleteScript = () => {
    if (scriptsListHook.selected === 'new') {
      setStatusMessage("Cannot delete a new script");
      return;
    }
    
    handleStorageDispatch('delete', scriptsListHook.selected);
    setStatusMessage("Script deleted successfully");
  };

  const injectScript = () => {
    if (!currentTab) {
      setStatusMessage("No active tab");
      return;
    }
    
    setStatusMessage("Injecting script...");
    
    chrome.tabs.sendMessage(currentTab.id, {
      action: "injectScript",
      scriptContent: scriptInput
    }, function(response) {
      if (chrome.runtime.lastError) {
        setStatusMessage(`Error: ${chrome.runtime.lastError.message}`);
      } else if (response && response.success) {
        setStatusMessage("Script injected successfully");
      } else {
        setStatusMessage("Failed to inject script");
      }
    });
  };

  const toggleScriptOverride = () => {
    if (!currentTab) {
      setStatusMessage("No active tab");
      return;
    }
    
    const newOverrideState = !overrideEnabled;
    setOverrideEnabled(newOverrideState);
    
    chrome.tabs.sendMessage(currentTab.id, {
      action: "toggleScriptOverride",
      enabled: newOverrideState,
      targetUrl: targetUrl,
      scriptContent: scriptInput
    }, function(response) {
      if (chrome.runtime.lastError) {
        setStatusMessage(`Error: ${chrome.runtime.lastError.message}`);
      } else if (response && response.success) {
        setStatusMessage(newOverrideState ? 
          `Override enabled for: ${targetUrl}` : 
          "Override disabled");
      } else {
        setStatusMessage("Failed to toggle override");
      }
    });
  };

  const extractScriptUrlFromPage = () => {
    if (!currentTab) {
      setStatusMessage("No active tab");
      return;
    }
    
    chrome.tabs.sendMessage(currentTab.id, {
      action: "getPageScripts"
    }, function(response) {
      if (chrome.runtime.lastError) {
        setStatusMessage(`Error: ${chrome.runtime.lastError.message}`);
      } else if (response && response.scripts && response.scripts.length > 0) {
        // Show a simple dropdown for script selection
        const scriptUrl = prompt(
          "Select a script URL to override (or enter a pattern):", 
          response.scripts.join("\n")
        );
        
        if (scriptUrl) {
          setTargetUrl(scriptUrl.trim());
          setStatusMessage(`Target set to: ${scriptUrl.trim()}`);
        }
      } else {
        setStatusMessage("No scripts found on page");
      }
    });
  };

  return (
    <div className="w-[600px] min-h-[500px] bg-gray-900 text-gray-100 p-4 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Code className="h-5 w-5 text-purple-400" />
          <h1 className="text-lg font-bold text-purple-400">Script Debug</h1>
        </div>
        <button 
          onClick={toggleScriptOverride} 
          className={`px-3 py-1 rounded ${overrideEnabled ? "bg-purple-600" : "bg-gray-700"} hover:bg-purple-500`}
        >
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
          <button
            onClick={extractScriptUrlFromPage}
            className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded"
            title="Find scripts on this page"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Enter the URL or domain of the script you want to override
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="flex space-x-2 mb-4">
        <button 
          className="flex-1 flex items-center justify-center space-x-1 bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded"
          onClick={injectScript}
        >
          <Play className="h-4 w-4" />
          <span>Inject Once</span>
        </button>
        <button 
          className="flex-1 flex items-center justify-center space-x-1 bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded" 
          onClick={handleSaveScript}
        >
          <Save className="h-4 w-4" />
          <span>Save</span>
        </button>
        <button 
          className="flex items-center justify-center bg-red-600 hover:bg-red-700 px-3 py-2 rounded"
          onClick={handleDeleteScript}
        >
          <Trash2 className="h-4 w-4" />
        </button>
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
            extensions={[
              javascript({ jsx: true }),
              lintGutter()
            ]}
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

      {/* Status */}
      <div className="mt-4 text-xs text-gray-400">Status: {statusMessage}</div>
    </div>
  );
}