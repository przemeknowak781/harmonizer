Run and review music theory engine tests:

1. Run `npx vitest run src/engine/` to execute engine unit tests
2. If tests fail, analyze failures and suggest fixes
3. Check test coverage for:
   - All 12 keys × all supported modes (major, minor, dorian, mixolydian, pentatonic)
   - Scale degree calculation edge cases (chromatic notes between scale degrees)
   - Harmony preset output for known input pitches
   - MIDI ↔ frequency conversion accuracy
   - Interval calculation across octave boundaries
4. Suggest missing test cases if coverage gaps exist
