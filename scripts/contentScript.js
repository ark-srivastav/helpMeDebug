// Content script for Shopify Script Debugger
console.log('Shopify Script Debugger content script initialized');

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
      // Send to background script which has access to chrome.scripting API
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
      // Forward to background script which handles network interception
      chrome.runtime.sendMessage({
        action: 'toggleScriptOverride',
        enabled: request.enabled,
        targetUrl: request.targetUrl,
        scriptContent: request.scriptContent
      }, (response) => {
        sendResponse(response);
      });
      return true;
    }
    
    // Get current override status from background script
    else if (request.action === 'getOverrideStatus') {
      // Ask background script for current status
      chrome.runtime.sendMessage({
        action: 'getOverrideStatus'
      }, (response) => {
        sendResponse(response);
      });
      return true;
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