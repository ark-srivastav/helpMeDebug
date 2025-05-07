// popup/src/components/ScriptNameModal.jsx
import React, { useRef, useEffect, useState } from 'react';

const ScriptNameModal = ({ isOpen, onClose, onSave, initialValue = '' }) => {
  const [nameValue, setNameValue] = useState(initialValue || '');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setNameValue(initialValue || '');
      setError('');
      // Focus the input field when the modal opens
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 100);
    }
  }, [isOpen, initialValue]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate name
    const trimmedName = nameValue.trim();
    if (!trimmedName) {
      setError('Please enter a name for your script');
      return;
    }
    
    // Save with trimmed name
    onSave(trimmedName);
  };

  const handleKeyDown = (e) => {
    // Close on escape
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-gray-800 rounded-lg p-6 w-96 shadow-xl">
        <h3 className="text-lg font-medium text-gray-100 mb-4">Save Script</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">
              Give your script a name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={nameValue}
              onChange={(e) => {
                setNameValue(e.target.value);
                if (error) setError('');
              }}
              className={`w-full bg-gray-700 border ${
                error ? 'border-red-500' : 'border-gray-600'
              } rounded px-3 py-2 text-gray-100 focus:outline-none focus:border-purple-500`}
              placeholder="e.g., Shopify Cart Fixer"
            />
            {error && (
              <p className="mt-1 text-sm text-red-500">{error}</p>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded text-white"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScriptNameModal;