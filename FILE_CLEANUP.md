# FILE_CLEANUP.md

This document is an internal, non-destructive proposal listing files and directories in
the repository that appear to be generated, vendor-provided, or otherwise safe to
archive or remove. Nothing in this document is being deleted now — this is a
recommendation and plan for review. Follow the archival checklist before deleting.

Audit metadata
- Author: Enterprise Orchestrator Agent
- Date: 2026-02-13
- Branch (local working copy): fix/lint-upgrade (no commits/push performed)

Scope & goals
- Reduce noise in repo caused by generated bundles and compiled artifacts
- Improve CI performance and developer experience
- Keep source-of-truth for production code in src/, agents/, and tests/
- Move large vendor assets, build outputs, and examples to an archive branch or separate
  storage to preserve history without polluting everyday development

Candidates for archival/removal (draft)

1) vantus_agents/
   - Why: Large vendor or packaged agent bundles and frontend build artifacts. These
     appear to be compiled/bundled outputs and vendor code that is not actively
     maintained in this repo.
   - Risk: Low if these are purely generated bundles, but verify there are no
     uncommitted source files needed by the project.
   - Recommendation: Move entire directory to an archive branch (e.g.,
     `archive/vantus_agents-<date>`) or a separate repository. Add a small README
     in its place referencing the archive.

2) agents/*/*.js (compiled artifacts alongside TypeScript sources)
   - Why: Several agent directories include compiled JS files and maps. Source is
     present in .ts files — these JS files are build artifacts and duplicate
     functionality.
   - Risk: Medium — make sure tests / consumers don't import the compiled JS
     (some CI/instrumentation might rely on them). Confirm test suite passes when
     they are temporarily moved.
   - Recommendation: Move compiled .js/.map files to archive. Ensure build outputs
     are produced during CI from TypeScript sources instead.

3) tools/index.js and other top-level compiled JS in tools/
   - Why: Likely JavaScript build artifacts. Keep TypeScript sources only.
   - Recommendation: Archive and leave a TypeScript source/README explaining how
     to regenerate.

4) frontend build directories (examples/autogpt_platform/frontend/build/web and similar)
   - Why: Large prebuilt frontend artifacts (canvaskit, wasm, node_modules-like bundles)
   - Risk: Low for codebase operation but large in repo size.
   - Recommendation: Archive; replace with link or instructions to rebuild.

5) scripts/*.js (review individually)
   - Why: Some are Node CLI scripts used during install (postinstall/native-integrate).
     These are legitimate and should remain CommonJS. Do not delete without review.
   - Recommendation: Keep, but audit scripts for duplication or outdated logic.

6) Examples and demos that are not actively maintained
   - Why: Example/demo apps can be large and outdated.
   - Recommendation: Move to `archive/examples-<date>` or a `examples-legacy/` folder
     that is excluded from core workflows. Keep README linking to archived copy.

Archival checklist (recommended steps before removal)
1. Create an archive branch: git checkout -b archive/<path>-YYYYMMDD
2. Move candidate files to the archive branch (commit and push the archive branch
   if desired). This keeps history intact and makes removal reversible.
3. On main development branch, remove the files and replace with a README that
   points to the archive branch or storage location.
4. Run full CI (lint, build, tests) to ensure no breakages.
5. Announce in relevant channels and allow a 72-hour review window before final deletion.

Additional notes
- Do not remove Node CLI scripts (scripts/*.js) until you have confirmed their
  responsibilities and ensured alternative implementations exist.
- Preserve package.json scripts and CI config that refer to any moved paths —
  update them to reference regenerated build steps where necessary.
- Consider using Git LFS or a release artifact storage for very large files that
  must remain accessible but not stored in main Git history.

Next steps for maintainers
- I can prepare a patch that moves selected directories to an archive branch
  (no pushes) and generate a CHANGESET describing the removals.
- Or, I can generate a proposed PR description and the exact git commands
  recommended to perform archival safely.

If you want me to generate the archival patches/diffs now, reply with which
directories you'd like moved first (I recommend starting with vantus_agents/).
