// Global state to track script overrides
let scriptOverrideEnabled = false;
let scriptOverrideTarget = '';
let scriptOverrideContent = '';

// Function to send a message to the background script to set up interception
function setupScriptInterception() {
  // Send the current configuration to the background script
  chrome.runtime.sendMessage({
    action: 'setupInterception',
    config: {
      enabled: scriptOverrideEnabled,
      targetUrl: scriptOverrideTarget,
      scriptContent: scriptOverrideContent
    }
  }, (response) => {
    console.log('Interception setup result:', response?.success ? 'success' : 'failed');
  });
}

// Function to get all script sources on the page
function getPageScripts() {
  return Array.from(document.querySelectorAll('script[src]'))
    .map(script => script.src)
    .filter(src => src && src.length > 0);
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    // Handle one-time script injection
    if (request.action === 'injectScript') {
      // Ask the background script to inject the code
      chrome.runtime.sendMessage({
        action: 'executeScript',
        code: request.scriptContent
      }, (response) => {
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
    console.error('Error in content script:', error);
    sendResponse({ success: false, error: error.message });
  }
  
  // Return true to indicate we'll send a response asynchronously
  return true;
});

// Log initialization
console.log('Shopify Script Debugger content script initialized');