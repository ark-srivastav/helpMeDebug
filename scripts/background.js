// background.js - No ES modules for service workers

// Utility function for styled logging
function logWithStyle(type = "info", prefix = "[Script Debugger | BG]", message, ...args) {
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

// Store override configurations per tab
const tabOverrideConfigs = new Map();

// Log initialization immediately to verify script loading
const log = (type, message, ...args) => logWithStyle(type, "[Script Debugger | BG]", message, ...args);

// Register the service worker
self.addEventListener('install', (event) => {
  log("info", 'Service worker installed');
  self.skipWaiting(); // Ensure the service worker activates immediately
});

self.addEventListener('activate', (event) => {
  log("info", 'Service worker activated');
  // Claim any existing clients
  event.waitUntil(clients.claim());
});

// Function to inject the interception code
function injectInterceptionCode(tabId, config) {
  log("info", 'Injecting interception code for tab', tabId);

  // First, we'll inject a function to handle the interception
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: setupInterception,
    args: [config.targetUrl, config.scriptContent, config.enabled],
    world: 'MAIN'  // This is important - it executes in the page's context
  }).then(() => {
    log("info", 'Interception code injected successfully for tab', tabId);
  }).catch(error => {
    log("error", 'Failed to inject interception code:', error);
  });

  // This function will be serialized and injected into the page
  function setupInterception(targetUrl, scriptContent, enabled) {
    // Don't re-inject if already present
    if (window.__scriptInterceptorSetup) {
      window.__scriptInterceptorEnabled = enabled;
      window.__scriptInterceptorTarget = targetUrl;
      window.__scriptInterceptorContent = scriptContent;
      console.log('Updated interception config:', { enabled, target: targetUrl });
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
    window.fetch = async function (resource, init) {
      // Check if interception is enabled and URL matches target
      if (
        window.__scriptInterceptorEnabled &&
        typeof resource === 'string' &&
        resource.includes(window.__scriptInterceptorTarget)
      ) {
        console.log('Intercepted fetch request for:', resource);

        // Return custom script content
        return new Response(
          window.__scriptInterceptorContent,
          {
            status: 200,
            headers: { 'Content-Type': 'application/javascript' }
          }
        );
      }

      // Otherwise, proceed with original fetch
      return originalFetch.apply(this, arguments);
    };

    // Override XMLHttpRequest
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      // Store URL for later reference
      this._interceptedUrl = url;
      return originalXhrOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (...args) {
      if (
        window.__scriptInterceptorEnabled &&
        this._interceptedUrl &&
        typeof this._interceptedUrl === 'string' &&
        this._interceptedUrl.includes(window.__scriptInterceptorTarget)
      ) {
        console.log('Intercepted XHR request for:', this._interceptedUrl);

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
    document.createElement = function (tagName, options) {
      const element = originalCreateElement.call(document, tagName, options);

      if (
        window.__scriptInterceptorEnabled &&
        tagName.toLowerCase() === 'script'
      ) {
        // Store original setAttribute
        const originalSetAttribute = element.setAttribute;

        // Override setAttribute to catch 'src' attribute setting
        element.setAttribute = function (name, value) {
          if (
            name === 'src' &&
            typeof value === 'string' &&
            value.includes(window.__scriptInterceptorTarget)
          ) {
            console.log('Intercepted script src attribute:', value);

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

    console.log('Script interception initialized:', { enabled, target: targetUrl });
    return true;
  }
}

// Function to properly inject and execute a script in the tab
function executeScript(tabId, code) {
  log('info', 'Executing script in tab', tabId);

  return chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: injectAndExecuteScript,
    args: [code],
    world: 'MAIN'  // Execute in page context
  });

  // This function will be injected into the page
  function injectAndExecuteScript(scriptCode) {
    try {
      // Create a unique ID for this script instance
      const scriptId = 'injected-debug-script-' + Date.now();
      
      // Track console output
      const logs = [];
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      const originalConsoleWarn = console.warn;
      
      // Override console methods to capture output
      console.log = function(...args) {
        logs.push({ type: 'log', content: args });
        originalConsoleLog.apply(console, args);
      };
      
      console.error = function(...args) {
        logs.push({ type: 'error', content: args });
        originalConsoleError.apply(console, args);
      };
      
      console.warn = function(...args) {
        logs.push({ type: 'warn', content: args });
        originalConsoleWarn.apply(console, args);
      };
      
      // Create a proper script element
      const scriptElement = document.createElement('script');
      scriptElement.id = scriptId;
      
      // Add an event listener for errors
      scriptElement.onerror = (event) => {
        logs.push({ 
          type: 'error', 
          content: [`Error loading script: ${event.type}`] 
        });
      };
      
      // Set the script content directly
      scriptElement.textContent = scriptCode;
      
      // Append to document head
      document.head.appendChild(scriptElement);
      
      // Restore original console methods
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      
      // Return success result with logs
      return {
        success: true,
        scriptId: scriptId,
        logs: logs
      };
    } catch (error) {
      // Return error information
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }
}

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  log('info', 'Background received message:', request.action);

  // Handle script execution
  if (request.action === 'executeScript') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        log('error', 'No active tab found');
        sendResponse({ success: false, error: 'No active tab found' });
        return;
      }

      executeScript(tabs[0].id, request.code)
        .then(results => {
          log('info', 'Script execution results:', results);
          sendResponse({ success: true, results });
        })
        .catch(error => {
          log('error', 'Script execution error:', error);
          sendResponse({ success: false, error: error.message });
        });
    });

    return true;  // Keep message channel open
  }

  // Handle interception setup
  else if (request.action === 'setupInterception') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        log('error', 'No active tab found');
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
    const tabId = sender?.tab?.id;

    if (!tabId) {
      log('error', 'No tab ID provided in updateInterceptionConfig');
      sendResponse({ success: false, error: 'No tab ID provided' });
      return true;
    }

    // Update stored config
    const config = tabOverrideConfigs.get(tabId) || {
      enabled: false,
      targetUrl: '',
      scriptContent: ''
    };

    config.enabled = request.enabled;
    config.targetUrl = request.targetUrl;
    config.scriptContent = request.scriptContent;

    tabOverrideConfigs.set(tabId, config);

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
      log('info', 'Updated interception config for tab', tabId);
      sendResponse({ success: true });
    }).catch(error => {
      log('error', 'Error updating interception config:', error);
      sendResponse({ success: false, error: error.message });
    });

    return true;  // Keep message channel open
  }

  log('info', 'Unhandled message action:', request.action);
  return false;
});

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only run on complete load
  if (changeInfo.status === 'complete') {
    log('info','Tab updated:', tabId);

    // Check if we have a configuration for this tab
    if (tabOverrideConfigs.has(tabId)) {
      const config = tabOverrideConfigs.get(tabId);

      // Only inject if enabled
      if (config.enabled) {
        log('info', 'Reinjecting interception for tab', tabId);
        injectInterceptionCode(tabId, config);
      }
    }
  }
});

// Log final initialization
log('info', 'Background script initialization complete');