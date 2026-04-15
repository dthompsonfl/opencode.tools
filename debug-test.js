const { RunStore } = require('./dist/src/runtime/run-store.js');
const { ToolWrapper } = require('./dist/src/runtime/tool-wrapper.js');
const fs = require('fs');

async function test() {
  const sandboxDir = fs.mkdtempSync('/tmp/test-');
  const runStore = new RunStore('run-propagation-001', sandboxDir);
  const wrapper = new ToolWrapper(runStore);

  const result = await wrapper.execute('integration.tool', 'v1', { value: 1 }, async () => {
    return { value: 42 };
  });

  const records = await runStore.getAuditLogger().readAll();
  console.log(JSON.stringify(records, null, 2));
}

test();
