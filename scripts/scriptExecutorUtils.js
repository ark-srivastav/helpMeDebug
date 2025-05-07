// scripts/scriptExecutorUtils.js

/**
 * Utility functions for script execution
 */

/**
 * Generate a unique ID for script elements
 * @returns {string} A unique script ID
 */
export function generateScriptId() {
  return 'injected-script-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
}

/**
 * Creates an injectable script element from code content
 * @param {string} code - The JavaScript code to execute
 * @param {string} [id] - Optional ID for the script element
 * @returns {HTMLScriptElement} The created script element
 */
export function createScriptElement(code, id = null) {
  const scriptElement = document.createElement('script');
  
  if (id) {
    scriptElement.id = id;
  } else {
    scriptElement.id = generateScriptId();
  }
  
  // Set script content
  scriptElement.textContent = code;
  
  return scriptElement;
}

/**
 * Injects and executes a script in the page
 * @param {string} code - The JavaScript code to execute
 * @returns {Promise<Object>} Promise resolving with execution results
 */
export function injectAndExecute(code) {
  return new Promise((resolve, reject) => {
    try {
      const scriptId = generateScriptId();
      
      // Create script element
      const scriptElement = createScriptElement(code, scriptId);
      
      // Set up error handling
      scriptElement.onerror = (event) => {
        reject(new Error(`Script execution failed: ${event.type}`));
      };
      
      // Append to document
      document.head.appendChild(scriptElement);
      
      // Resolve with success
      resolve({
        success: true,
        scriptId: scriptId
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Removes a previously injected script
 * @param {string} scriptId - ID of the script to remove
 * @returns {boolean} True if successful, false otherwise
 */
export function removeInjectedScript(scriptId) {
  try {
    const scriptElement = document.getElementById(scriptId);
    
    if (scriptElement && scriptElement.parentNode) {
      scriptElement.parentNode.removeChild(scriptElement);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error removing script:', error);
    return false;
  }
}

/**
 * Removes all scripts with IDs matching a pattern
 * @param {string} pattern - Pattern to match in script IDs
 * @returns {number} Number of scripts removed
 */
export function cleanupScriptsByPattern(pattern = 'injected-script-') {
  try {
    const scripts = document.querySelectorAll('script[id^="' + pattern + '"]');
    let count = 0;
    
    scripts.forEach(script => {
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
        count++;
      }
    });
    
    return count;
  } catch (error) {
    console.error('Error cleaning up scripts:', error);
    return 0;
  }
}