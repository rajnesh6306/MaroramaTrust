const pending = new Map();
const receipts = new Map();
const MAX_AGE = 30 * 60 * 1000;

function setPending(id, data) { pending.set(id, data); }
function getPending(id) { return pending.get(id); }
function deletePending(id) { pending.delete(id); }
function setReceipt(id, receipt) { receipts.set(id, receipt); }
function getReceipt(id) { return receipts.get(id); }
function deleteReceipt(id) { receipts.delete(id); }
function cleanup() {
  const now = Date.now();
  for (const [id, value] of pending) if (now - value.createdAt > MAX_AGE) pending.delete(id);
  for (const [id, value] of receipts) if (now - value.createdAt > MAX_AGE) receipts.delete(id);
}

module.exports = { MAX_AGE, setPending, getPending, deletePending, setReceipt, getReceipt, deleteReceipt, cleanup };
