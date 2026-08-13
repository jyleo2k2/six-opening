const NodeModule = require("node:module");

const originalLoad = NodeModule._load;
NodeModule._load = function loadWithServerOnlyMarker(request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, parent, isMain);
};
