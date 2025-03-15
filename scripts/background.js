// Store override configurations per tab
const tabOverrideConfigs = new Map();

// Log initialization
console.log('Shopify Script Debugger background script initialized');

// Function to inject the interception code
function injectInterceptionCode(tabId, config) {
  // First, we'll inject a function to handle the interception
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: setupInterception,
    args: [config.targetUrl, config.scriptContent, config.enabled],
    world: 'MAIN'  // This is important - it executes in the page's context
  }).then(() => {
    console.log('Interception code injected successfully for tab', tabId);
  }).catch(error => {
    console.error('Failed to inject interception code:', error);
  });

  // This function will be serialized and injected into the page
  function setupInterception(targetUrl, scriptContent, enabled) {
    // Don't re-inject if already present
    if (window.__scriptInterceptorSetup) {
      window.__scriptInterceptorEnabled = enabled;
      window.__scriptInterceptorTarget = targetUrl;
      window.__scriptInterceptorContent = scriptContent;
      console.log(
        '%c[Script Debugger]', 
        'background: #5046e5; color: white; padding: 2px 4px; border-radius: 2px;', 
        'Updated interception config:',
        { enabled, target: targetUrl }
      );
      return;
    }

    // Mark as setup
    window.__scriptInterceptorSetup = true;
    window.__scriptInterceptorEnabled = enabled;
    window.__scriptInterceptorTarget = targetUrl;
    window.__scriptInterceptorContent = scriptContent;

    // Store original methods
    const originalFetch = window.fetch;
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    const originalXhrSend = XMLHttpRequest.prototype.send;
    const originalCreateElement = document.createElement;

    // Override fetch API
    window.fetch = async function(resource, init) {
      // Check if interception is enabled and URL matches target
      if (
        window.__scriptInterceptorEnabled && 
        typeof resource === 'string' && 
        resource.includes(window.__scriptInterceptorTarget)
      ) {
        console.log(
          '%c[Script Debugger]', 
          'background: #5046e5; color: white; padding: 2px 4px; border-radius: 2px;', 
          'Intercepted fetch request for:', 
          resource
        );
        
        // Return custom script content
        return new Response(
          window.__scriptInterceptorContent, 
          { 
            status: 200,
            headers: {'Content-Type': 'application/javascript'}
          }
        );
      }
      
      // Otherwise, proceed with original fetch
      return originalFetch.apply(this, arguments);
    };
    
    // Override XMLHttpRequest
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      // Store URL for later reference
      this._interceptedUrl = url;
      return originalXhrOpen.apply(this, arguments);
    };
    
    XMLHttpRequest.prototype.send = function(...args) {
      if (
        window.__scriptInterceptorEnabled && 
        this._interceptedUrl && 
        typeof this._interceptedUrl === 'string' && 
        this._interceptedUrl.includes(window.__scriptInterceptorTarget)
      ) {
        console.log(
          '%c[Script Debugger]', 
          'background: #5046e5; color: white; padding: 2px 4px; border-radius: 2px;', 
          'Intercepted XHR request for:', 
          this._interceptedUrl
        );
        
        // Simulate a successful response
        setTimeout(() => {
          Object.defineProperty(this, 'readyState', { value: 4 });
          Object.defineProperty(this, 'status', { value: 200 });
          Object.defineProperty(this, 'responseText', { value: window.__scriptInterceptorContent });
          
          // Trigger load event
          const event = new Event('load');
          this.dispatchEvent(event);
          if (typeof this.onload === 'function') {
            this.onload(event);
          }
        }, 0);
        
        return;
      }
      
      return originalXhrSend.apply(this, args);
    };
    
    // Override script element creation
    document.createElement = function(tagName, options) {
      const element = originalCreateElement.call(document, tagName, options);
      
      if (
        window.__scriptInterceptorEnabled && 
        tagName.toLowerCase() === 'script'
      ) {
        // Store original setAttribute
        const originalSetAttribute = element.setAttribute;
        
        // Override setAttribute to catch 'src' attribute setting
        element.setAttribute = function(name, value) {
          if (
            name === 'src' && 
            typeof value === 'string' && 
            value.includes(window.__scriptInterceptorTarget)
          ) {
            console.log(
              '%c[Script Debugger]', 
              'background: #5046e5; color: white; padding: 2px 4px; border-radius: 2px;', 
              'Intercepted script src attribute:', 
              value
            );
            
            // Set a timer to replace script content
            setTimeout(() => {
              if (element.parentNode) {
                // Replace content and remove src
                element.textContent = window.__scriptInterceptorContent;
                element.removeAttribute('src');
                
                // Trigger load event
                const event = new Event('load');
                element.dispatchEvent(event);
                if (typeof element.onload === 'function') {
                  element.onload(event);
                }
              }
            }, 0);
            
            return;
          }
          
          return originalSetAttribute.apply(this, arguments);
        };
      }
      
      return element;
    };
    
    console.log(
      '%c[Script Debugger]', 
      'background: #5046e5; color: white; padding: 2px 4px; border-radius: 2px;', 
      'Script interception initialized:',
      { enabled, target: targetUrl }
    );
    
    return true;
  }
}

// Function to execute a script in a tab
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
  
  // Handle interception setup
  else if (request.action === 'setupInterception') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        sendResponse({ success: false, error: 'No active tab found' });
        return;
      }
      
      const tabId = tabs[0].id;
      
      // Store config for this tab
      tabOverrideConfigs.set(tabId, request.config);
      
      // Inject the interception code
      injectInterceptionCode(tabId, request.config);
      
      sendResponse({ success: true });
    });
    
    return true;  // Keep message channel open
  }
  
  // Handle update interception config
  else if (request.action === 'updateInterceptionConfig') {
    const tabId = sender.tab.id;
    
    // Update stored config
    if (tabOverrideConfigs.has(tabId)) {
      const config = tabOverrideConfigs.get(tabId);
      config.enabled = request.enabled;
      config.targetUrl = request.targetUrl;
      config.scriptContent = request.scriptContent;
      
      // Execute script to update variables in page context
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (enabled, target, content) => {
          window.__scriptInterceptorEnabled = enabled;
          window.__scriptInterceptorTarget = target;
          window.__scriptInterceptorContent = content;
          return true;
        },
        args: [config.enabled, config.targetUrl, config.scriptContent],
        world: 'MAIN'
      }).then(() => {
        sendResponse({ success: true });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    } else {
      sendResponse({ success: false, error: 'No configuration for this tab' });
    }
    
    return true;  // Keep message channel open
  }
  
  return false;
});

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only run on complete load
  if (changeInfo.status === 'complete') {
    // Check if we have a configuration for this tab
    if (tabOverrideConfigs.has(tabId)) {
      const config = tabOverrideConfigs.get(tabId);
      
      // Only inject if enabled
      if (config.enabled) {
        injectInterceptionCode(tabId, config);
      }
    }
  }
});