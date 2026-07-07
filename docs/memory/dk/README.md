# DK Handoff Memory

This folder is the handoff note for the `dk` branch before another AI/person promotes the work to `master`.

Read these files in order:

1. `00_current_state.md` - current branch status, deployed pieces, and what was verified.
2. `01_table_map.md` - which `la_*` tables own each runtime feature.
3. `02_runtime_flows.md` - frontend to Edge Function to table flow.
4. `03_master_merge_checklist.md` - exact checks to run before pushing to `master`.

Core rule:

- The cloned test frontend/runtime must use `la_*` tables.
- Do not write new runtime data to legacy tables such as `schools`, `meals`, `ratings`, `review_comments`, `review_reactions`, `battles`, or `battle_votes`.
- Browser writes to review/battle runtime tables must go through Edge Functions, not direct REST table writes.

