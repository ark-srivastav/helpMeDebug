// Global state to track script overrides
let scriptOverrideEnabled = false;
let scriptOverrideTarget = '';
let scriptOverrideContent = '';

// Utility function for styled logging
function logWithStyle(type = "info", prefix = "[Script Debugger | FG]", message, ...args) {
  let styles;

  switch (type) {
    case 'info':
      styles = 'background: #5046e5; color: white; padding: 3px 6px; border-radius: 3px; font-weight: bold;';
      console.log(`%c${prefix}`, styles, message, ...args);
      break;
    case 'success':
      styles = 'background: #10b981; color: white; padding: 3px 6px; border-radius: 3px; font-weight: bold;';
      console.log(`%c${prefix}`, styles, message, ...args);
      break;
    case 'warning':
      styles = 'background: #f59e0b; color: white; padding: 3px 6px; border-radius: 3px; font-weight: bold;';
      console.warn(`%c${prefix}`, styles, message, ...args);
      break;
    case 'error':
      styles = 'background: #ef4444; color: white; padding: 3px 6px; border-radius: 3px; font-weight: bold;';
      console.error(`%c${prefix}`, styles, message, ...args);
      break;
  }
}

const log = (type, message, ...args) => logWithStyle(type, "[Script Debugger | FG]", message, ...args);

// Use multiple logging methods to ensure visibility
log('info', 'Content script initialized');

// Add a visible element to the page to confirm content script injection
const debugIndicator = document.createElement('div');
debugIndicator.id = 'shopify-script-debugger-indicator';
debugIndicator.style.position = 'fixed';
debugIndicator.style.bottom = '10px';
debugIndicator.style.right = '10px';
debugIndicator.style.backgroundColor = 'rgba(80, 70, 229, 0.8)';
debugIndicator.style.color = 'white';
debugIndicator.style.padding = '5px 8px';
debugIndicator.style.borderRadius = '4px';
debugIndicator.style.fontSize = '12px';
debugIndicator.style.fontFamily = 'monospace';
debugIndicator.style.zIndex = '9999';
debugIndicator.style.display = 'none'; // Hidden by default
debugIndicator.textContent = 'Script Debugger Active';

// Add the indicator to the page (will be hidden initially)
document.documentElement.appendChild(debugIndicator);

// Function to send a message to the background script to set up interception
function setupScriptInterception() {
  try {
    // Send the current configuration to the background script
    chrome.runtime.sendMessage({
      action: 'setupInterception',
      config: {
        enabled: scriptOverrideEnabled,
        targetUrl: scriptOverrideTarget,
        scriptContent: scriptOverrideContent
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        log('error','Error setting up interception:', chrome.runtime.lastError.message);
        return;
      }
      log('warning','Interception setup result:', response?.success ? 'success' : 'failed');
    });
  } catch (error) {
    log('error','Error in setupScriptInterception:', error);
  }
}

// Function to get all script sources on the page
function getPageScripts() {
  try {
    return Array.from(document.querySelectorAll('script[src]'))
      .map(script => script.src)
      .filter(src => src && src.length > 0);
  } catch (error) {
    log('error','Error getting page scripts:', error);
    return [];
  }
}

// Enhanced content script execution handler for script injection

// Track previously injected scripts for cleanup
let injectedScripts = [];

// Handler for script injection
function handleScriptInjection(request, sender, sendResponse) {
  log('info', 'Handling script injection request');
  
  // Clean up previously injected scripts to prevent conflicts
  cleanupPreviousScripts();
  
  // Ask the background script to inject the code
  chrome.runtime.sendMessage({
    action: 'executeScript',
    code: request.scriptContent
  }, (response) => {
    if (chrome.runtime.lastError) {
      log('error', 'Error executing script:', chrome.runtime.lastError.message);
      sendResponse({ 
        success: false, 
        error: chrome.runtime.lastError.message 
      });
      return;
    }
    
    // If the script was successfully injected, track its ID
    if (response && response.success && 
        response.results && response.results.length > 0 && 
        response.results[0].result && response.results[0].result.scriptId) {
      injectedScripts.push(response.results[0].result.scriptId);
    }
    
    sendResponse(response);
  });
  
  // Return true to indicate we'll send a response asynchronously
  return true;
}

// Clean up previously injected scripts to prevent duplicate declarations
function cleanupPreviousScripts() {
  try {
    // Execute a script to remove previously injected scripts
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) return;
      
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (scriptIds) => {
          // Remove each script with the tracked IDs
          scriptIds.forEach(id => {
            const scriptElement = document.getElementById(id);
            if (scriptElement && scriptElement.parentNode) {
              scriptElement.parentNode.removeChild(scriptElement);
            }
          });
          return true;
        },
        args: [injectedScripts],
        world: 'MAIN'
      }).then(() => {
        // Clear the tracked scripts after cleanup
        injectedScripts = [];
        log('info', 'Previous scripts cleaned up successfully');
      }).catch(error => {
        log('error', 'Error cleaning up scripts:', error);
      });
    });
  } catch (error) {
    log('error', 'Error in cleanupPreviousScripts:', error);
  }
}

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  log('success','Received message:', request.action);

  if (request.action === 'injectScript') {
    return handleScriptInjection(request, sender, sendResponse);
  }

  // Test connection message - respond immediately
  if (request.action === 'testConnection') {
    log('success','Connection test received:', request.message);

    // Show the debug indicator briefly
    const indicator = document.getElementById('shopify-script-debugger-indicator');
    if (indicator) {
      indicator.style.display = 'block';
      setTimeout(() => {
        indicator.style.display = 'none';
      }, 3000); // Hide after 3 seconds
    }

    sendResponse({
      success: true,
      message: 'Content script is alive and responding'
    });
    return true;
  }

  try {
    // Handle one-time script injection
    if (request.action === 'injectScript') {
      // Ask the background script to inject the code
      chrome.runtime.sendMessage({
        action: 'executeScript',
        code: request.scriptContent
      }, (response) => {
        if (chrome.runtime.lastError) {
          log('error','Error executing script:', chrome.runtime.lastError.message);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        sendResponse(response);
      });
      return true; // Keep the message channel open for async response
    }

    // Handle script override toggle
    else if (request.action === 'toggleScriptOverride') {
      scriptOverrideEnabled = request.enabled;
      scriptOverrideTarget = request.targetUrl;
      scriptOverrideContent = request.scriptContent;

      // Setup the interception if enabled
      if (scriptOverrideEnabled) {
        setupScriptInterception();
      }

      // Notify the background script of the change
      chrome.runtime.sendMessage({
        action: 'updateInterceptionConfig',
        enabled: scriptOverrideEnabled,
        targetUrl: scriptOverrideTarget,
        scriptContent: scriptOverrideContent
      }, (response) => {
        if (chrome.runtime.lastError) {
          log('warning', 'Error updating config:', chrome.runtime.lastError.message);
        }
      });

      sendResponse({ success: true });
    }

    // Get current override status
    else if (request.action === 'getOverrideStatus') {
      sendResponse({
        enabled: scriptOverrideEnabled,
        targetUrl: scriptOverrideTarget
      });
    }

    // Get scripts on the page
    else if (request.action === 'getPageScripts') {
      sendResponse({
        success: true,
        scripts: getPageScripts()
      });
    }
  } catch (error) {
    log('error', 'Error in message handler:', error);
    sendResponse({ success: false, error: error.message });
  }

  // Return true to indicate we'll send a response asynchronously
  return true;
});

// Notify that content script is fully loaded
window.addEventListener('load', () => {
  log('info', 'Page fully loaded');
});

// Final initialization log
log('info', 'Content script setup complete');