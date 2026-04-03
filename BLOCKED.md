# BLOCKED

## RESOLVED

### TASK 11: GitHub push (resolved 2026-04-03)

- `gh` CLI is now installed and authenticated as `lamb356`.
- Remote `origin` is set to `https://github.com/lamb356/bomkit.git`.
- All commits are pushed and in sync with remote.

## STILL BLOCKED

### TASK 12: KiCad pcbnew integration test

Date: 2026-04-03

Blocker:
- KiCad is not installed on this machine. The `pcbnew` Python module is only available inside KiCad's embedded Python environment.
- This cannot be resolved from WSL2 — it requires a Windows KiCad installation.

Impact:
- All 32 non-pcbnew tests pass (parser-based pipeline verification works).
- The true `pcbnew` integration test (`bomkit-fab/tests/test_integration.py`) is skipped.

To unblock:
1. Install KiCad 10 on Windows.
2. Open `bomkit-fab/tests/fixtures/test_board/test_board.kicad_pcb` in pcbnew.
3. In Tools > Scripting Console, run:
   ```python
   import runpy
   runpy.run_path(r'C:\Users\burba\bomkit\bomkit-fab\tests\test_integration.py', run_name='__main__')
   ```
4. Verify output CSVs match expected fixtures.
