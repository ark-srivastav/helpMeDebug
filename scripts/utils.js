/**
 * @typedef {'info' | 'success' | 'warning' | 'error'} LogType
 * @typedef {'[Script Debugger | BG]' | '[Script Debugger | FG]'} PrefixType
 * 
 * @typedef {function(LogType, *, ...any): void} LoggerFunction
 * 
 * /**
 * Creates a styled logging function with a custom prefix.
 * 
 * @param {PrefixType} prefix - The prefix to prepend to all log messages
 * @returns {LoggerFunction} A logging function
 */
 export const logWithStyle = (prefix = "[Script Debugger | BG]") => (type = "info", message, ...args) => {
  let styles;

  switch (type) {
    case 'info':
      styles = 'background: #5046e5; color: white; padding: 3px 6px; border-radius: 3px; font-weight: bold;';
      prefix = '[Script Debugger | BG]';
      console.log(`%c${prefix}`, styles, message, ...args);
      break;
    case 'success':
      styles = 'background: #10b981; color: white; padding: 3px 6px; border-radius: 3px; font-weight: bold;';
      prefix = '[Script Debugger | BG]';
      console.log(`%c${prefix}`, styles, message, ...args);
      break;
    case 'warning':
      styles = 'background: #f59e0b; color: white; padding: 3px 6px; border-radius: 3px; font-weight: bold;';
      prefix = '[Script Debugger | BG]';
      console.warn(`%c${prefix}`, styles, message, ...args);
      break;
    case 'error':
      styles = 'background: #ef4444; color: white; padding: 3px 6px; border-radius: 3px; font-weight: bold;';
      prefix = '[Script Debugger | BG]';
      console.error(`%c${prefix}`, styles, message, ...args);
      break;
  }
};