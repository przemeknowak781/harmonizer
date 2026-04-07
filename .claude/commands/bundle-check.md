Check bundle size against the 500 KB gzipped target:

1. Run `npm run build`
2. Analyze the output in `dist/` — list all chunks with sizes
3. Check gzipped total size: `find dist -name '*.js' -o -name '*.css' | xargs gzip -c | wc -c`
4. If over 500 KB, identify the largest chunks and suggest optimizations:
   - Tree-shaking opportunities
   - Dynamic imports for non-critical code
   - AudioWorklet files should be separate chunks (not bundled with main)
5. Report: total size, per-chunk breakdown, pass/fail vs. 500 KB target
