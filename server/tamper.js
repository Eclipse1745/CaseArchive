// Demo helper: edits a sealed file in storage so "Verify Integrity" fails.
//   node tamper.js                        -> lists workspace folders
//   node tamper.js <workspaceId>          -> lists that workspace's files
//   node tamper.js <workspaceId> <file>   -> appends a line to that file
require('dotenv').config();
const { supabase, BUCKET } = require('./db');

(async () => {
  const [ws, name] = process.argv.slice(2);
  const store = supabase.storage.from(BUCKET);

  if (!ws) {
    const { data, error } = await store.list('', { limit: 100 });
    if (error) throw error;
    return console.log(data.map((f) => f.name).join('\n') || 'No workspaces yet.');
  }
  const folder = `${ws}/uploads`;
  if (!name) {
    const { data, error } = await store.list(folder);
    if (error) throw error;
    return console.log(data.map((f) => f.name).join('\n') || 'No files found for that workspace.');
  }

  const { data, error } = await store.download(`${folder}/${name}`);
  if (error) throw error;
  const edited = (await data.text()) + '\n[ALTERED] edited after sealing.';
  const up = await store.upload(`${folder}/${name}`, Buffer.from(edited), { upsert: true, contentType: 'text/plain' });
  if (up.error) throw up.error;
  console.log(`Tampered with ${name}. Now click Verify Integrity in the app.`);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
