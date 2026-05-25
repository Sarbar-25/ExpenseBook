# TODO (routing + dashboard inconsistency audit)

- [ ] BACKUP: ensure `src/App.jsx.backup` exists (manual backup check)
- [ ] Implement incremental routing/render conflict fixes in `src/App.jsx`
  - [ ] Add a single route->activeNav sync (remove any conflicting initial state logic)
  - [ ] Remove race: prevent `updateGlobalBalance` from refetching and overwriting state after `loadData`
  - [ ] Add a requestId guard so stale async responses can’t apply
  - [ ] Ensure theme application uses only the `[data-theme="..."]` CSS mechanism
- [ ] Comment out any uncertain routing branches instead of deleting
- [ ] Remove/avoid unused imports only when safe
- [ ] Test manually: switch dashboard/calendar/senders/lendBorrow/settings and verify correct UI persists
- [ ] After code stabilization: review CSS theme conflicts in `css/styles.css` (only if runtime styling mismatch remains)
- [ ] Run `npm test` or `npm run build` to confirm no regressions

