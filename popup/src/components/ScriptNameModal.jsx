// Add this component to your project
import React, { useRef, useEffect } from 'react';

const ScriptNameModal = ({ isOpen, onClose, onSave, initialValue = '' }) => {
  const inputRef = useRef(null);
  const [nameValue, setNameValue] = React.useState(initialValue);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (nameValue.trim()) {
      onSave(nameValue.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96 shadow-xl">
        <h3 className="text-lg font-medium text-gray-100 mb-4">Save Script</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">Script Name</label>
            <input
              ref={inputRef}
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 focus:outline-none focus:border-purple-500"
              placeholder="Enter a name for this script"
            />
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