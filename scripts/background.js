// In background.js, replace the current console.log statements with this enhanced version
/**
 * 
 * @param {'info' | 'success' | 'warning' | 'error'} type 
 * @param {*} message 
 * @param  {...any} args 
 */
// const logWithStyle = (type = "info", message, ...args) => {
//   let styles;
//   let prefix;

//   switch (type) {
//     case 'info':
//       styles = 'background: #5046e5; color: white; padding: 3px 6px; border-radius: 3px; font-weight: bold;';
//       prefix = '[Script Debugger | BG]';
//       console.log(`%c${prefix}`, styles, message, ...args);
//       break;
//     case 'success':
//       styles = 'background: #10b981; color: white; padding: 3px 6px; border-radius: 3px; font-weight: bold;';
//       prefix = '[Script Debugger | BG]';
//       console.log(`%c${prefix}`, styles, message, ...args);
//       break;
//     case 'warning':
//       styles = 'background: #f59e0b; color: white; padding: 3px 6px; border-radius: 3px; font-weight: bold;';
//       prefix = '[Script Debugger | BG]';
//       console.warn(`%c${prefix}`, styles, message, ...args);
//       break;
//     case 'error':
//       styles = 'background: #ef4444; color: white; padding: 3px 6px; border-radius: 3px; font-weight: bold;';
//       prefix = '[Script Debugger | BG]';
//       console.error(`%c${prefix}`, styles, message, ...args);
//       break;
//   }
// };

// Store override configurations per tab
import { logWithStyle } from "./utils"
const tabOverrideConfigs = new Map();

// Log initialization immediately to verify script loading
const logIt = logWithStyle("[Script Debugger | BG]")

// Register the service worker
self.addEventListener('install', (event) => {
  logIt("info", 'Service worker installed');
  self.skipWaiting(); // Ensure the service worker activates immediately
});

self.addEventListener('activate', (event) => {
  logIt("info", 'Service worker activated');
  // Claim any existing clients
  event.waitUntil(clients.claim());
});

// Function to inject the interception code
function injectInterceptionCode(tabId, config) {
  logIt("info", 'Injecting interception code for tab', tabId);

  // First, we'll inject a function to handle the interception
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: setupInterception,
    args: [config.targetUrl, config.scriptContent, config.enabled],
    world: 'MAIN'  // This is important - it executes in the page's context
  }).then(() => {
    logIt("info", 'Interception code injected successfully for tab', tabId);
  }).catch(error => {
    logIt("error", 'Failed to inject interception code:', error);
  });

  // This function will be serialized and injected into the page
  function setupInterception(targetUrl, scriptContent, enabled) {
    // Don't re-inject if already present
    if (window.__scriptInterceptorSetup) {
      window.__scriptInterceptorEnabled = enabled;
      window.__scriptInterceptorTarget = targetUrl;
      window.__scriptInterceptorContent = scriptContent;
      logIt("info",
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
    window.fetch = async function (resource, init) {
      // Check if interception is enabled and URL matches target
      if (
        window.__scriptInterceptorEnabled &&
        typeof resource === 'string' &&
        resource.includes(window.__scriptInterceptorTarget)
      ) {
        logIt("info",
          'Intercepted fetch request for:',
          resource
        );

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
        logIt("info",
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
            logIt("info",
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

    logIt("info",
      'Script interception initialized:',
      { enabled, target: targetUrl }
    );

    return true;
  }
}

// In background.js, improve the executeScript function
function executeScript(tabId, code) {
  logIt('info', 'Executing script in tab', tabId);

  return chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: (scriptCode) => {
      try {
        // Create a wrapper function that'll catch console.log outputs
        const originalConsoleLog = console.log;
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;

        let logs = [];

        // Override console methods to capture output
        console.log = function (...args) {
          logs.push({ type: 'log', content: args });
          originalConsoleLog.apply(console, args);
        };

        console.error = function (...args) {
          logs.push({ type: 'error', content: args });
          originalConsoleError.apply(console, args);
        };

        console.warn = function (...args) {
          logs.push({ type: 'warn', content: args });
          originalConsoleWarn.apply(console, args);
        };

        // Execute the script
        let result;
        try {
          result = (new Function(scriptCode))();
        } catch (error) {
          // Restore original console methods
          console.log = originalConsoleLog;
          console.error = originalConsoleError;
          console.warn = originalConsoleWarn;

          // Log the error with original console.error
          originalConsoleError('%c[Script Debugger] Script Error', 'background: #e74c3c; color: white; padding: 2px 4px; border-radius: 2px;', error);

          return {
            error: error.message,
            stack: error.stack,
            logs
          };
        }

        // Restore original console methods
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;

        // Return both the result and any captured logs
        return {
          result,
          logs
        };
      } catch (error) {
        return { error: error.message, stack: error.stack };
      }
    },
    args: [code],
    world: 'MAIN'  // Execute in page context
  });
}
// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  logIt('info', 'Background received message:', request.action);

  // Handle script execution
  if (request.action === 'executeScript') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        logIt('error', 'No active tab found');
        sendResponse({ success: false, error: 'No active tab found' });
        return;
      }

      executeScript(tabs[0].id, request.code)
        .then(results => {
          logIt('info', 'Script execution results:', results);
          sendResponse({ success: true, results });
        })
        .catch(error => {
          logIt('error', 'Script execution error:', error);
          sendResponse({ success: false, error: error.message });
        });
    });

    return true;  // Keep message channel open
  }

  // Handle interception setup
  else if (request.action === 'setupInterception') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        logIt('error', 'No active tab found');
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
      logIt('error', 'No tab ID provided in updateInterceptionConfig');
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
      logIt('info', 'Updated interception config for tab', tabId);
      sendResponse({ success: true });
    }).catch(error => {
      logIt('error', 'Error updating interception config:', error);
      sendResponse({ success: false, error: error.message });
    });

    return true;  // Keep message channel open
  }

  logIt('info', 'Unhandled message action:', request.action);
  return false;
});

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only run on complete load
  if (changeInfo.status === 'complete') {
    logIt('info','Tab updated:', tabId);

    // Check if we have a configuration for this tab
    if (tabOverrideConfigs.has(tabId)) {
      const config = tabOverrideConfigs.get(tabId);

      // Only inject if enabled
      if (config.enabled) {
        logIt('error', 'Reinjecting interception for tab', tabId);
        injectInterceptionCode(tabId, config);
      }
    }
  }
});

// Log final initialization
logIt('info', 'Background script initialization complete');

// Function to test content script connection
function testContentScriptConnection(tabId) {
  logIt('info', 'Testing connection to content script in tab', tabId);

  chrome.tabs.sendMessage(tabId, {
    action: 'testConnection',
    message: 'Hello from background script'
  }, response => {
    if (chrome.runtime.lastError) {
      logIt('info', 'Connection test failed:', chrome.runtime.lastError.message, " tabID ", tabId);
    } else if (response) {
      logIt('info', 'Connection test successful:', response);
    } else {
      logIt('warning', 'Connection test received no response');
    }
  });
}

// // Test connection to content script when extension is clicked
// chrome.action.onClicked.addListener(tab => {
//   testContentScriptConnection(tab.id);
// });

// // Also test connection to the current active tab on startup
// chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
//   if (tabs.length > 0) {
//     testContentScriptConnection(tabs[0].id);
//   }
// });