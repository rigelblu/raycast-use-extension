// Stubs @raycast/api so Node-based tests can import modules that depend on it.
// Loaded via `node --require` from the `test` script — see package.json.
const { Module } = require("module");

const mock = {
  getPreferenceValues: () => ({}),
  Icon: {},
  Color: {},
  popToRoot: () => {},
  showHUD: () => {},
  Clipboard: { paste: () => {} },
  getFrontmostApplication: async () => ({ name: "Terminal", path: "/Applications/Terminal.app" }),
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "@raycast/api") {
    return mock;
  }
  return originalLoad.apply(this, arguments);
};
