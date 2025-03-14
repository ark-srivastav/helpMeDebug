import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Code, Play, Save, Plus, Trash2 } from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { linter, lintGutter } from "@codemirror/lint";
import { sampleScripts, DEFAULT_SCRIPT_INPUT, defaultScriptsListHook } from "../utils";
import { useScriptsListHook } from "../useScriptsListHook";
import { useStorageHook } from "../useStorageHook";
export default function DebuggerPopup() {
  // current script input
  // list of saved scripts comes -- or it handles on its own -- based on signal -- if we are using an old script or making new one which is not saved
  //
  //
  const [isActive, setIsActive] = useState(false);
  const [scriptInput, setScriptInput] = useState(DEFAULT_SCRIPT_INPUT);

  const [scriptsListHook, setScriptsListHook] = useState(defaultScriptsListHook);

  const [isMaximized, setIsMaximized] = useState(false);

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
    setScriptInput,
  });

  const { renderScriptsOptionsList } = useScriptsListHook({
    setScriptInput,

    scriptsListHook,
    setScriptsListHook,

    handleStorageDispatch,
  });

  return (
    // <div className="w-96 bg-gray-900 text-gray-100 p-4 font-mono">
    <div className="w-[600px] min-h-[500px] bg-gray-900 text-gray-100 p-4 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Code className="h-5 w-5 text-purple-400" />
          <h1 className="text-lg font-bold text-purple-400">Script Debug</h1>
        </div>
        <button onClick={() => setIsActive(!isActive)} className={`px-3 py-1 rounded ${isActive ? "bg-purple-600" : "bg-gray-700"} hover:bg-purple-500`}>
          {isActive ? "Active" : "Inactive"}
        </button>
      </div>
      {renderScriptsOptionsList()}
      {/* Quick Actions */}
      <div className="flex space-x-2 mb-4">
        <button className="flex-1 flex items-center justify-center space-x-1 bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded">
          <Play className="h-4 w-4" />
          <span>Inject</span>
        </button>
        <button className="flex-1 flex items-center justify-center space-x-1 bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded" onClick={handleStorageDispatch}>
          <Save className="h-4 w-4" />
          <span>Save</span>
        </button>
        <button className="flex items-center justify-center bg-red-600 hover:bg-red-700 px-3 py-2 rounded">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Script Editor */}
      <div className="relative">
        {/* // Replace the editor section with: */}
        <div className={`relative w-full transition-all duration-200 ${isMaximized ? "fixed top-0 left-0 right-0 bottom-0 z-50 bg-gray-900 p-4" : ""}`}>
          <div className="flex justify-end mb-2">
            <button onClick={() => handleMaximize()} className="bg-purple-600 hover:bg-purple-700 p-1 rounded">
              {isMaximized ? "Minimize" : "Maximize"}
            </button>
          </div>
          <CodeMirror
            value={scriptInput}
            height="400px"
            theme={oneDark}
            extensions={[
              javascript({ jsx: true }),
              lintGutter(),
              // Basic JS linting
              linter(javascript()),
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
        <button className="absolute bottom-3 right-3 bg-purple-600 hover:bg-purple-700 p-1 rounded">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Status */}
      <div className="mt-4 text-xs text-gray-400">Status: Ready to inject</div>
    </div>
  );
}
