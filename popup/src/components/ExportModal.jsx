// popup/src/components/ExportModal.jsx
import React, { useState, useEffect } from 'react';

const ExportModal = ({ isOpen, onClose, scripts, onExport }) => {
  const [selectedScripts, setSelectedScripts] = useState({});
  const [allSelected, setAllSelected] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  // Reset selections when modal opens or scripts change
  useEffect(() => {
    if (isOpen && scripts) {
      const initialSelection = {};
      scripts.forEach(script => {
        initialSelection[script.value] = true;
      });
      setSelectedScripts(initialSelection);
      setAllSelected(true);
    }
  }, [isOpen, scripts]);

  // Toggle individual script selection
  const toggleScriptSelection = (scriptId) => {
    const newSelection = {
      ...selectedScripts,
      [scriptId]: !selectedScripts[scriptId]
    };
    setSelectedScripts(newSelection);
    
    // Check if all scripts are selected
    const isAllSelected = scripts.every(script => newSelection[script.value]);
    setAllSelected(isAllSelected);
  };

  // Toggle select all scripts
  const toggleSelectAll = () => {
    const newSelectAll = !allSelected;
    const newSelection = {};
    
    scripts.forEach(script => {
      newSelection[script.value] = newSelectAll;
    });
    
    setSelectedScripts(newSelection);
    setAllSelected(newSelectAll);
  };

  // Handle export button click
  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    
    try {
      // Filter selected script IDs
      const scriptIds = Object.entries(selectedScripts)
        .filter(([_, isSelected]) => isSelected)
        .map(([scriptId]) => scriptId);
      
      if (scriptIds.length === 0) {
        setExportError("Please select at least one script to export");
        setIsExporting(false);
        return;
      }
      
      // Call export function
      const result = await onExport(scriptIds);
      
      if (result) {
        onClose();
      } else {
        setExportError("Failed to export scripts");
      }
    } catch (error) {
      console.error("Export error:", error);
      setExportError(error.message || "An error occurred during export");
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96 max-h-[80vh] overflow-auto shadow-xl">
        <h3 className="text-lg font-medium text-gray-100 mb-4">Export Scripts</h3>
        
        <div className="mb-4">
          <label className="flex items-center space-x-2 text-gray-200 mb-2 font-medium">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="rounded"
            />
            <span>All</span>
          </label>
          
          <div className="ml-6 space-y-2 max-h-60 overflow-y-auto">
            {scripts.map(script => (
              <label key={script.value} className="flex items-center space-x-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={!!selectedScripts[script.value]}
                  onChange={() => toggleScriptSelection(script.value)}
                  className="rounded"
                />
                <span className="truncate">{script.label}</span>
              </label>
            ))}
          </div>
        </div>
        
        {exportError && (
          <div className="mb-4 text-red-400 text-sm">{exportError}</div>
        )}
        
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-200"
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white flex items-center"
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;