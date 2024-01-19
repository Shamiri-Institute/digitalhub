import path from "node:path";

export const Fixtures = {
  supervisor: {
    stateFile: path.join(__dirname, `./fixtures/supervisor-state.json`),
  },
  hubCoordinator: {
    stateFile: path.join(__dirname, `./fixtures/hub-coordinator-state.json`),
  },
  operations: {
    stateFile: path.join(__dirname, `./fixtures/operations-state.json`),
  },
};
