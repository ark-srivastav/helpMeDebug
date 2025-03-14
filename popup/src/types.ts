// For individual script options in the dropdown
export interface ScriptOption {
  label: string;
  value: string;
}

// For the scripts list and selection state
export interface ScriptsList {
  options: ScriptOption[];
  selected: string;
}

// For stored script data
export interface SavedScript {
  content: string;
  lastModified: string;
  description?: string;
}
