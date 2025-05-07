export const sampleScripts = [
  // {
  //   label: "Sample-Script.js",
  //   value: "sample.js"
  // },
  // {
  //   label: "merchant-script-v1.js",
  //   value: "default"
  // },
  // {
  //   label: "merchant-test.js",
  //   value: "test"
  // },
]

export const SCRIPT_STORAGE_KEY = "SAVED_SCRIPT"
export const DEFAULT_SCRIPT_INPUT = `console.log("Yello")`


export const defaultScriptsListHook = {
  options: sampleScripts,
  selected: sampleScripts[0]?.value
}