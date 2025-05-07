// popup/src/components/UnsavedChangesModal.jsx
import React from 'react';

const UnsavedChangesModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  const handleSave = () => {
    onConfirm(true);
  };

  const handleDiscard = () => {
    onConfirm(false);
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96 shadow-xl">
        <h3 className="text-lg font-medium text-gray-100 mb-4">Unsaved Changes</h3>
        <p className="text-gray-300 mb-6">
          You have unsaved changes in your current script. Would you like to save them before continuing?
        </p>
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-gray-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDiscard}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-gray-200"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded text-white"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnsavedChangesModal;