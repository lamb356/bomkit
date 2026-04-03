# BLOCKED

## RESOLVED

### TASK 11: GitHub push (resolved 2026-04-03)

- `gh` CLI is now installed and authenticated as `lamb356`.
- Remote `origin` is set to `https://github.com/lamb356/bomkit.git`.
- All commits are pushed and in sync with remote.

### TASK 12: KiCad pcbnew integration test (resolved 2026-04-03)

- KiCad was installed on Windows and the integration test was executed with KiCad's embedded Python.
- The true pcbnew path passed successfully against the fixture board.
- Windows KiCad path used:
  - `C:\Users\burba\AppData\Local\Programs\KiCad\9.0\bin\python.exe`
- Verified outputs were written to:
  - `bomkit-fab/tests/fixtures/test_board/generated/manual_kicad/test_board_BOM_JLCPCB.csv`
  - `bomkit-fab/tests/fixtures/test_board/generated/manual_kicad/test_board_CPL_JLCPCB.csv`
- Board adapter compatibility fixes were applied so the plugin now works with real KiCad pcbnew behavior.

## STILL BLOCKED

At the moment there are no active blocked tasks recorded in this file.
