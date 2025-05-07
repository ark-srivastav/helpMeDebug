// popup/src/components/ImportModal.jsx
import React, { useState, useRef } from 'react';

const ImportModal = ({ isOpen, onClose, onImport }) => {
  const [file, setFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    // Validate file
    if (!selectedFile) {
      setFile(null);
      return;
    }
    
    // Check file type (must be CSV)
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setImportError("Only CSV files are supported");
      setFile(null);
      return;
    }
    
    // Check file size (max 50MB)
    if (selectedFile.size > 50 * 1024 * 1024) {
      setImportError("File size must be less than 50MB");
      setFile(null);
      return;
    }
    
    // Clear previous errors and success messages
    setImportError(null);
    setSuccessMessage(null);
    setFile(selectedFile);
  };

  const handleImport = async () => {
    if (!file) {
      setImportError("Please select a file to import");
      return;
    }
    
    setIsImporting(true);
    setImportError(null);
    setSuccessMessage(null);
    
    try {
      // Read file content
      const fileContent = await readFileAsText(file);
      
      // Check for the identifier
      if (!fileContent.startsWith('Script injectors list')) {
        setImportError("Invalid file format: The file does not contain script data");
        setIsImporting(false);
        return;
      }
      
      // Call import function
      const importedIds = await onImport(fileContent);
      
      if (importedIds && importedIds.length > 0) {
        setSuccessMessage(`Successfully imported ${importedIds.length} scripts`);
        
        // Reset file input
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Close modal after 2 seconds
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setImportError("No scripts were imported");
      }
    } catch (error) {
      console.error("Import error:", error);
      setImportError(error.message || "An error occurred during import");
    } finally {
      setIsImporting(false);
    }
  };

  // Helper function to read file as text
  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        resolve(event.target.result);
      };
      
      reader.onerror = (error) => {
        reject(error);
      };
      
      reader.readAsText(file);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96 shadow-xl">
        <h3 className="text-lg font-medium text-gray-100 mb-4">Import Scripts</h3>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select CSV File
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="w-full bg-gray-700 text-gray-300 border border-gray-600 rounded px-3 py-2"
          />
          <p className="mt-1 text-xs text-gray-400">
            Only CSV files exported from Script Debugger are supported (Max 50MB)
          </p>
        </div>
        
        {importError && (
          <div className="mb-4 text-red-400 text-sm">{importError}</div>
        )}
        
        {successMessage && (
          <div className="mb-4 text-green-400 text-sm">{successMessage}</div>
        )}
        
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-200"
            disabled={isImporting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded text-white flex items-center"
            disabled={!file || isImporting}
          >
            {isImporting ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;