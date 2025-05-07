// scripts/storageService.js
// This module handles all IndexedDB operations for script storage

export const DB_NAME = 'ShopifyScriptDebuggerDB';
export const DB_VERSION = 1;
export const SCRIPTS_STORE = 'scripts';

/**
 * Initialize the IndexedDB database
 * @returns {Promise} A promise that resolves when the database is ready
 */
export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      reject(`Database error: ${event.target.error}`);
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object store for scripts if it doesn't exist
      if (!db.objectStoreNames.contains(SCRIPTS_STORE)) {
        const store = db.createObjectStore(SCRIPTS_STORE, { keyPath: 'id' });
        
        // Create indexes for script data
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('lastModified', 'lastModified', { unique: false });
      }
    };
  });
}

/**
 * Get all scripts from the database
 * @returns {Promise<Array>} A promise that resolves with an array of scripts
 */
export function getAllScripts() {
  return new Promise((resolve, reject) => {
    initDB().then(db => {
      const transaction = db.transaction([SCRIPTS_STORE], 'readonly');
      const store = transaction.objectStore(SCRIPTS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (event) => {
        reject(`Error getting scripts: ${event.target.error}`);
      };
    }).catch(reject);
  });
}

/**
 * Get a script by ID
 * @param {string} id - The ID of the script to retrieve
 * @returns {Promise<Object>} A promise that resolves with the script data
 */
export function getScript(id) {
  return new Promise((resolve, reject) => {
    initDB().then(db => {
      const transaction = db.transaction([SCRIPTS_STORE], 'readonly');
      const store = transaction.objectStore(SCRIPTS_STORE);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (event) => {
        reject(`Error getting script: ${event.target.error}`);
      };
    }).catch(reject);
  });
}

/**
 * Save a script to the database
 * @param {Object} scriptData - The script data to save
 * @returns {Promise<string>} A promise that resolves with the script ID
 */
export function saveScript(scriptData) {
  return new Promise((resolve, reject) => {
    initDB().then(db => {
      const transaction = db.transaction([SCRIPTS_STORE], 'readwrite');
      const store = transaction.objectStore(SCRIPTS_STORE);
      
      // If no ID is provided, generate one
      if (!scriptData.id) {
        scriptData.id = `script_${Date.now()}`;
      }
      
      // Ensure the script has a name
      if (!scriptData.name || scriptData.name.trim() === '') {
        scriptData.name = generateDefaultScriptName();
      }
      
      // Set lastModified timestamp
      scriptData.lastModified = Date.now();
      
      const request = store.put(scriptData);

      request.onsuccess = () => {
        resolve(scriptData.id);
      };

      request.onerror = (event) => {
        reject(`Error saving script: ${event.target.error}`);
      };
    }).catch(reject);
  });
}


/**
 * Delete a script from the database
 * @param {string} id - The ID of the script to delete
 * @returns {Promise<boolean>} A promise that resolves with true if successful
 */
export function deleteScript(id) {
  return new Promise((resolve, reject) => {
    initDB().then(db => {
      const transaction = db.transaction([SCRIPTS_STORE], 'readwrite');
      const store = transaction.objectStore(SCRIPTS_STORE);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = (event) => {
        reject(`Error deleting script: ${event.target.error}`);
      };
    }).catch(reject);
  });
}

/**
 * Export all scripts as CSV
 * @param {Array<string>} scriptIds - Array of script IDs to export (empty for all)
 * @returns {Promise<string>} A promise that resolves with CSV content
 */
export function exportScriptsToCSV(scriptIds = []) {
  return new Promise((resolve, reject) => {
    getAllScripts().then(scripts => {
      // Filter scripts if specific IDs are provided
      const scriptsToExport = scriptIds.length > 0 
        ? scripts.filter(script => scriptIds.includes(script.id))
        : scripts;
      
      if (scriptsToExport.length === 0) {
        reject('No scripts to export');
        return;
      }
      
      // Convert to CSV format
      let csv = 'Script injectors list\n';
      csv += 'id,name,content,lastModified,description\n';
      
      scriptsToExport.forEach(script => {
        // Escape commas and newlines in content
        const content = script.content ? `"${script.content.replace(/"/g, '""')}"` : '';
        const description = script.description ? `"${script.description.replace(/"/g, '""')}"` : '';
        const name = script.name ? `"${script.name.replace(/"/g, '""')}"` : '';
        
        csv += `${script.id},${name},${content},${script.lastModified},${description}\n`;
      });
      
      resolve(csv);
    }).catch(reject);
  });
}

/**
 * Import scripts from CSV
 * @param {string} csvContent - The CSV content to import
 * @returns {Promise<Array>} A promise that resolves with array of imported script IDs
 */
export function importScriptsFromCSV(csvContent) {
  return new Promise((resolve, reject) => {
    // Check for identifier
    if (!csvContent.startsWith('Script injectors list')) {
      reject('Invalid CSV format: Missing identifier');
      return;
    }
    
    // Parse CSV content
    const lines = csvContent.split('\n');
    
    // Skip the first two lines (header)
    const scriptLines = lines.slice(2).filter(line => line.trim() !== '');
    
    if (scriptLines.length === 0) {
      reject('No scripts found in CSV');
      return;
    }
    
    const importPromises = scriptLines.map(line => {
      // Parse CSV line, handling quoted values with commas
      const parts = [];
      let currentPart = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          // Toggle quote state
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          // End of field
          parts.push(currentPart);
          currentPart = '';
        } else {
          currentPart += char;
        }
      }
      
      // Add the last part
      parts.push(currentPart);
      
      // Create script object
      const scriptData = {
        id: parts[0],
        name: parts[1].replace(/""/g, '"').replace(/^"|"$/g, ''),
        content: parts[2].replace(/""/g, '"').replace(/^"|"$/g, ''),
        lastModified: parseInt(parts[3]) || Date.now(),
        description: parts[4] ? parts[4].replace(/""/g, '"').replace(/^"|"$/g, '') : ''
      };
      
      // Save the script to the database
      return saveScript(scriptData);
    });
    
    // Wait for all imports to complete
    Promise.all(importPromises)
      .then(importedIds => {
        resolve(importedIds);
      })
      .catch(error => {
        reject(`Error importing scripts: ${error}`);
      });
  });
}

/**
 * Check if any scripts have been modified
 * @param {Object} scriptData - The script data to check
 * @returns {Promise<boolean>} A promise that resolves with true if script has unsaved changes
 */
export function hasUnsavedChanges(scriptId, currentContent) {
  return new Promise((resolve, reject) => {
    if (!scriptId || scriptId === 'new') {
      // For new scripts, check if content is not empty and not the default
      resolve(currentContent && currentContent.trim() !== '' && 
              currentContent !== '// Enter your new script here...' &&
              currentContent !== '// Enter your script here...');
      return;
    }
    
    getScript(scriptId).then(savedScript => {
      if (!savedScript) {
        resolve(false);
        return;
      }
      
      // Compare current content with saved content
      resolve(currentContent !== savedScript.content);
    }).catch(error => {
      console.error('Error checking for unsaved changes:', error);
      // In case of error, assume there are unsaved changes to be safe
      resolve(true);
    });
  });
}