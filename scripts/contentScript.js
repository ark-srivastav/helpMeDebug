// Global state to track script overrides
let scriptOverrideEnabled = false;
let scriptOverrideTarget = '';
let scriptOverrideContent = '';

// Use multiple logging methods to ensure visibility
console.log('[Shopify Script Debugger] Content script initialized');
// console.warn('[Shopify Script Debugger] Content script initialized (WARN)');
// console.error('[Shopify Script Debugger] Content script initialized (ERROR)');

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
// debugIndicator.style.display = 'none'; // Hidden by default
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
        console.warn('[Shopify Script Debugger] Error setting up interception:', chrome.runtime.lastError.message);
        return;
      }
      console.log('[Shopify Script Debugger] Interception setup result:', response?.success ? 'success' : 'failed');
    });
  } catch (error) {
    console.error('[Shopify Script Debugger] Error in setupScriptInterception:', error);
  }
}

// Function to get all script sources on the page
function getPageScripts() {
  try {
    return Array.from(document.querySelectorAll('script[src]'))
      .map(script => script.src)
      .filter(src => src && src.length > 0);
  } catch (error) {
    console.error('[Shopify Script Debugger] Error getting page scripts:', error);
    return [];
  }
}

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Shopify Script Debugger] Received message:', request.action);
  
  // Test connection message - respond immediately
  if (request.action === 'testConnection') {
    console.log('[Shopify Script Debugger] Connection test received:', request.message);
    
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
          console.warn('[Shopify Script Debugger] Error executing script:', chrome.runtime.lastError.message);
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
          console.warn('[Shopify Script Debugger] Error updating config:', chrome.runtime.lastError.message);
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
    console.error('[Shopify Script Debugger] Error in message handler:', error);
    sendResponse({ success: false, error: error.message });
  }
  
  // Return true to indicate we'll send a response asynchronously
  return true;
});

// Notify that content script is fully loaded
window.addEventListener('load', () => {
  console.log('[Shopify Script Debugger] Page fully loaded');
});

// Final initialization log
console.log('[Shopify Script Debugger] Content script setup complete');