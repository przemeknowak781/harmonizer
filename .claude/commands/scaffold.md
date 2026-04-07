Scaffold the Harmonizer project from scratch based on the spec in Harmonizer.md:

1. Initialize with `npm create vite@latest . -- --template react-ts`
2. Install dependencies: `tailwindcss @tailwindcss/vite zustand`
3. Install dev dependencies: `vitest @testing-library/react playwright eslint prettier`
4. Configure TypeScript strict mode in tsconfig.json
5. Configure Vite for AudioWorklet support (worker entry points)
6. Set up Tailwind CSS 4 with @tailwindcss/vite plugin
7. Set up ESLint 9 flat config
8. Set up Prettier
9. Create the directory structure from CLAUDE.md
10. Create placeholder files for core modules with type signatures
11. Verify with `npm run build` and `npm run type-check`
