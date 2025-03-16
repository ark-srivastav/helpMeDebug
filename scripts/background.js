// Store override configurations per tab
const tabOverrideConfigs = new Map();

// Store blob URLs for script overrides
const scriptBlobUrls = new Map();

// Log initialization
console.log('Shopify Script Debugger background script initialized');

// Function to create a blob URL for a script
function createScriptBlobUrl(scriptContent) {
  // Create a blob with the script content
  const blob = new Blob([scriptContent], { type: 'application/javascript' });
  // Create a URL for the blob
  return URL.createObjectURL(blob);
}

// Function to register network request blocking
function setupNetworkBlocking(tabId, config) {
  // Check if we already have a blob URL for this tab
  if (!scriptBlobUrls.has(tabId)) {
    // Create a new blob URL
    const blobUrl = createScriptBlobUrl(config.scriptContent);
    scriptBlobUrls.set(tabId, blobUrl);
  }
  
  // Log the setup
  console.log('Network blocking setup for tab', tabId, 'target:', config.targetUrl);
}

// Function to execute a one-time script in a tab
function executeScript(tabId, code) {
  return chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: (scriptCode) => {
      try {
        // Using Function constructor to execute code
        return (new Function(scriptCode))();
      } catch (error) {
        return { error: error.message };
      }
    },
    args: [code],
    world: 'MAIN'  // Execute in page context
  });
}

// Set up the webRequest listener for script blocking and redirection
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    // Check if we have an override for this tab
    if (tabOverrideConfigs.has(details.tabId)) {
      const config = tabOverrideConfigs.get(details.tabId);
      
      // Only intercept if override is enabled and URL matches target
      if (config.enabled && details.url.includes(config.targetUrl)) {
        console.log('Intercepting request:', details.url);
        
        // Get the blob URL for the replacement script
        const blobUrl = scriptBlobUrls.get(details.tabId);
        
        if (blobUrl) {
          // Redirect to our blob URL
          return { redirectUrl: blobUrl };
        }
      }
    }
    
    // Allow the request to proceed normally
    return { cancel: false };
  },
  { urls: ["<all_urls>"], types: ["script"] },
  ["blocking"]
);

// Clean up blob URLs when tabs are closed
chrome.tabs.onRemoved.addListener(function(tabId) {
  if (scriptBlobUrls.has(tabId)) {
    URL.revokeObjectURL(scriptBlobUrls.get(tabId));
    scriptBlobUrls.delete(tabId);
  }
  
  if (tabOverrideConfigs.has(tabId)) {
    tabOverrideConfigs.delete(tabId);
  }
});

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle script execution
  if (request.action === 'executeScript') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        sendResponse({ success: false, error: 'No active tab found' });
        return;
      }
      
      executeScript(tabs[0].id, request.code)
        .then(results => {
          sendResponse({ success: true, results });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
    });
    
    return true;  // Keep message channel open
  }
  
  // Handle script override toggle
  else if (request.action === 'toggleScriptOverride') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        sendResponse({ success: false, error: 'No active tab found' });
        return;
      }
      
      const tabId = tabs[0].id;
      
      // Update or create config for this tab
      tabOverrideConfigs.set(tabId, {
        enabled: request.enabled,
        targetUrl: request.targetUrl,
        scriptContent: request.scriptContent
      });
      
      // If enabled, set up network blocking
      if (request.enabled) {
        setupNetworkBlocking(tabId, {
          targetUrl: request.targetUrl,
          scriptContent: request.scriptContent
        });
      } else {
        // If disabled and we have a blob URL, revoke it
        if (scriptBlobUrls.has(tabId)) {
          URL.revokeObjectURL(scriptBlobUrls.get(tabId));
          scriptBlobUrls.delete(tabId);
        }
      }
      
      sendResponse({ success: true });
    });
    
    return true;  // Keep message channel open
  }
  
  // Handle getting current override status
  else if (request.action === 'getOverrideStatus') {
    if (sender.tab && tabOverrideConfigs.has(sender.tab.id)) {
      const config = tabOverrideConfigs.get(sender.tab.id);
      sendResponse({
        enabled: config.enabled,
        targetUrl: config.targetUrl
      });
    } else {
      sendResponse({
        enabled: false,
        targetUrl: ''
      });
    }
    
    return true;
  }
  
  return false;
});

// Log initialization complete
console.log('Background script initialization complete');