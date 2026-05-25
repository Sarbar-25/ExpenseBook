## Recovery plan (no risky deletions)

### Goal
Restore missing functionality required by `src/App.jsx` and ensure refresh persistence works.

### Root findings
- `src/App.jsx` imports from `src/utils.js`:
  - `fetchDashboardMetrics`, `testFirestoreConnection`, `deleteFromFirebase`, and expects `fetchFromFirebase()` to return `receiverTransactions`.
- Current `src/utils.js` does **not** export those helpers and `fetchFromFirebase()` only returns `{expenses, transactions}`.

### Edits to apply (safe)
1. `src/utils.js`
   - Extend `fetchFromFirebase(userId)` to also load `receiver_transactions` and return `receiverTransactions`.
   - Add `deleteFromFirebase(collectionName, docId)`.
     - It should work with the current `App.jsx` signature that does NOT pass `userId`.
     - Use `auth.currentUser?.uid` as fallback for `userId`.
   - Add `testFirestoreConnection()` (lightweight read to validate Firestore access).
   - Add `fetchDashboardMetrics(userId)` by computing totals from `transactions`, `expenses`, and `receiverTransactions`.

2. Keep all existing hooks/localStorage/API calls intact.
3. Run:
   - `npm run build`
   - `npm run dev`
4. Smoke check:
   - login
   - add balance/expense/transaction
   - refresh page
   - verify data still appears
   - ensure no blank screen.

