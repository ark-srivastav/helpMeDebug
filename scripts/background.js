// Store override configurations per origin
const overrideConfigs = new Map();

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Shopify Script Debugger installed');
});

// Listen for tab updates 
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only run when the page has finished loading
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      // Get the origin from the tab URL
      const url = new URL(tab.url);
      const origin = url.origin;
      
      // Check if we have overrides for this origin
      if (overrideConfigs.has(origin)) {
        const config = overrideConfigs.get(origin);
        
        // Send the override configuration to the tab
        chrome.tabs.sendMessage(tabId, {
          action: 'toggleScriptOverride',
          enabled: config.enabled,
          targetUrl: config.targetUrl,
          scriptContent: config.scriptContent
        }).catch(err => {
          // Content script might not be ready yet, which is fine
          console.log(`Tab ${tabId} not ready: ${err.message}`);
        });
      }
    } catch (error) {
      console.error('Error in background script:', error);
    }
  }
});

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle script execution request
  if (request.action === 'executeScript') {
    try {
      // Get the active tab
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (!tabs || !tabs[0] || !tabs[0].id) {
          sendResponse({ success: false, error: 'No active tab found' });
          return;
        }
        
        // Execute the script in the page context
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: (codeToExecute) => {
            // Create a new function from the code string and execute it
            try {
              // For simple one-time script injection
              return (new Function(codeToExecute))();
            } catch (err) {
              console.error('Script execution error:', err);
              return { error: err.message };
            }
          },
          args: [request.code]
        }, (results) => {
          if (chrome.runtime.lastError) {
            sendResponse({ 
              success: false, 
              error: chrome.runtime.lastError.message 
            });
          } else {
            sendResponse({ 
              success: true, 
              results: results 
            });
          }
        });
      });
      
      return true; // Keep the message channel open for the async response
    } catch (error) {
      console.error('Error executing script:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  
  // Save override configuration when set
  else if (request.action === 'saveOverrideConfig' && sender.tab) {
    try {
      const url = new URL(sender.tab.url);
      const origin = url.origin;
      
      overrideConfigs.set(origin, {
        enabled: request.enabled,
        targetUrl: request.targetUrl,
        scriptContent: request.scriptContent
      });
      
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error saving override config:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  
  // Return true for async response
  return true;
});