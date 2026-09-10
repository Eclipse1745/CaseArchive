const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.json');

let state = {
  cases: [],
  documents: [],
  auditLog: [],
  nextIds: { case: 1, document: 1, audit: 1 },
};

function load() {
  if (fs.existsSync(DB_PATH)) {
    state = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  }
}

function save() {
  fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2));
}

function nextId(kind) {
  const id = state.nextIds[kind]++;
  save();
  return id;
}

function reset(freshState) {
  state = freshState;
  save();
}

module.exports = {
  load,
  save,
  reset,
  nextId,
  get state() {
    return state;
  },
  DB_PATH,
};
