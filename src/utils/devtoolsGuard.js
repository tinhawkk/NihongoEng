let devtoolsBlocked = false;
const controllers = new Set();

export function isDevtoolsBlocked() {
  return false; // Disabled
}

export function setDevtoolsBlocked() {
  // Disabled
}

export function registerRequest(controller) {
  controllers.add(controller);
  return () => controllers.delete(controller);
}

export function abortAllRequests() {
  controllers.forEach(ctrl => {
    try {
      ctrl.abort();
    } catch (e) {
      // ignore
    }
  });
  controllers.clear();
}
