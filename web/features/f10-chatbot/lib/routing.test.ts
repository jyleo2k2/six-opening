import assert from "node:assert/strict";
import { routeMessage } from "./routing";

assert.equal(routeMessage("PER\uc774 \ubb50\uc57c?").route, "faq");
assert.equal(routeMessage("\ub9e4\uc218 \uc5b4\ub5bb\uac8c \ud574?").route, "faq");
assert.equal(routeMessage("\uc218\uc775\ub960\uc774 \ubb50\uc57c?").route, "faq");
assert.equal(routeMessage("\ubb34\uc2a8 \uc885\ubaa9 \uc0ac?").route, "refusal");
assert.equal(routeMessage("\ube44\ubc00\ubc88\ud638\ub97c \uc54c\ub824\uc904\uac8c").route, "safety");
assert.equal(routeMessage("\uad81\uae08\ud55c \uac8c \uc788\uc5b4").route, "fallback");

console.log("routing tests passed");

