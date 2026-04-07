Review all AudioWorklet code for performance issues:

1. Scan `src/audio/worklets/` for any memory allocation inside `process()` methods
2. Check for `console.log`, `JSON.stringify`, or other GC-triggering calls in worklet processors
3. Verify all audio buffers are pre-allocated (Float32Array reuse, not new allocations per frame)
4. Check that no regular arrays are used where typed arrays should be
5. Verify SharedArrayBuffer usage patterns are correct (if used)
6. Report findings with file:line references and suggested fixes
