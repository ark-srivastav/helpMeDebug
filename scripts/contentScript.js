// Global state to track script overrides
let scriptOverrideEnabled = false;
let scriptOverrideTarget = '';
let scriptOverrideContent = '';

// Function to inject script that sets up interception
function injectScriptOverrideHandler() {
  // We need to use a function that will be stringified and injected
  function setupInterception() {
    // Store original methods to intercept
    const originalFetch = window.fetch;
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    const originalXhrSend = XMLHttpRequest.prototype.send;
    
    // Keep track of override configs
    let scriptOverrideEnabled = false;
    let scriptOverrideTarget = '';
    let scriptOverrideContent = '';
    
    // Listen for messages from content script
    window.addEventListener('message', function(event) {
      // Make sure message is from our extension
      if (event.source !== window || !event.data || event.data.source !== 'shopify-script-debugger') {
        return;
      }
      
      if (event.data.action === 'updateOverrideConfig') {
        scriptOverrideEnabled = event.data.enabled;
        scriptOverrideTarget = event.data.targetUrl;
        scriptOverrideContent = event.data.scriptContent;
        
        console.log(
          '%c[Script Debugger]', 
          'background: #5046e5; color: white; padding: 2px 4px; border-radius: 2px;', 
          scriptOverrideEnabled ? 
            'Script override enabled for: ' + scriptOverrideTarget : 
            'Script override disabled'
        );
      }
    });
    
    // Override fetch API
    window.fetch = async function(resource, init) {
      // Check if the override is enabled and the URL matches
      if (scriptOverrideEnabled && 
          typeof resource === 'string' && 
          resource.includes(scriptOverrideTarget)) {
        
        console.log(
          '%c[Script Debugger]', 
          'background: #5046e5; color: white; padding: 2px 4px; border-radius: 2px;', 
          'Intercepted fetch request for:', resource
        );
        
        // Return our custom script instead
        return new Response(
          scriptOverrideContent, 
          { 
            status: 200,
            headers: {'Content-Type': 'application/javascript'}
          }
        );
      }
      
      // Otherwise use the original fetch
      return originalFetch.apply(this, arguments);
    };
    
    // Override XMLHttpRequest
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      // Store the URL so we can check it in send()
      this._url = url;
      return originalXhrOpen.apply(this, arguments);
    };
    
    XMLHttpRequest.prototype.send = function(...args) {
      if (scriptOverrideEnabled && 
          this._url && 
          typeof this._url === 'string' && 
          this._url.includes(scriptOverrideTarget)) {
          
        console.log(
          '%c[Script Debugger]', 
          'background: #5046e5; color: white; padding: 2px 4px; border-radius: 2px;', 
          'Intercepted XHR request for:', this._url
        );
        
        // Mock a successful response with our script
        setTimeout(() => {
          Object.defineProperty(this, 'readyState', { value: 4, writable: true });
          Object.defineProperty(this, 'status', { value: 200, writable: true });
          Object.defineProperty(this, 'responseText', { value: scriptOverrideContent, writable: true });
          
          // Trigger the load event
          const loadEvent = new Event('load');
          this.dispatchEvent(loadEvent);
          
          if (typeof this.onload === 'function') {
            this.onload(loadEvent);
          }
        }, 0);
        
        return;
      }
      
      return originalXhrSend.apply(this, args);
    };
    
    // Handle script elements being added to the page
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName, options) {
      const element = originalCreateElement.call(document, tagName, options);
      
      if (scriptOverrideEnabled && tagName.toLowerCase() === 'script') {
        // Monitor src attribute changes
        const originalSetAttribute = element.setAttribute;
        element.setAttribute = function(name, value) {
          if (name === 'src' && 
              typeof value === 'string' && 
              value.includes(scriptOverrideTarget)) {
                
            console.log(
              '%c[Script Debugger]', 
              'background: #5046e5; color: white; padding: 2px 4px; border-radius: 2px;', 
              'Intercepted script src attribute:', value
            );
            
            // Instead of setting src, we'll inline our script
            const originalParentAppendChild = Node.prototype.appendChild;
            
            // Set a timer to check if this element gets appended
            setTimeout(() => {
              if (element.parentNode) {
                // Replace the script content
                element.textContent = scriptOverrideContent;
                
                // If we're monitoring, remove the src attribute
                element.removeAttribute('src');
                
                // Trigger a fake load event
                const loadEvent = new Event('load');
                element.dispatchEvent(loadEvent);
                
                if (typeof element.onload === 'function') {
                  element.onload(loadEvent);
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
    
    console.log('%c[Script Debugger]', 'background: #5046e5; color: white; padding: 2px 4px; border-radius: 2px;', 'Script interception initialized');
  }
  
  // Convert the function to a string and execute it in the page context
  const scriptCode = `(${setupInterception.toString()})();`;
  
  // We need to use the chrome.scripting API to inject this script
  // This requires a message to the background script
  chrome.runtime.sendMessage({
    action: 'executeScript',
    code: scriptCode
  });
}

// Function to get all script sources on the page
function getPageScripts() {
  const scripts = Array.from(document.querySelectorAll('script[src]'))
    .map(script => script.src)
    .filter(src => src && src.length > 0);
  
  return scripts;
}

// Update the page with current override settings
function updateOverrideConfig() {
  window.postMessage({
    source: 'shopify-script-debugger',
    action: 'updateOverrideConfig',
    enabled: scriptOverrideEnabled,
    targetUrl: scriptOverrideTarget,
    scriptContent: scriptOverrideContent
  }, '*');
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    // Handle script injection
    if (request.action === 'injectScript') {
      // Instead of injecting directly, send a message to the background script
      chrome.runtime.sendMessage({
        action: 'executeScript',
        code: request.scriptContent
      }, (response) => {
        sendResponse({ success: true });
      });
      return true; // Keep the message channel open for async response
    }
    
    // Handle script override toggle
    else if (request.action === 'toggleScriptOverride') {
      scriptOverrideEnabled = request.enabled;
      scriptOverrideTarget = request.targetUrl;
      scriptOverrideContent = request.scriptContent;
      updateOverrideConfig();
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

// Initialize script interception
injectScriptOverrideHandler();