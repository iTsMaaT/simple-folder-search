import { defineConfig } from "tsup"

export default defineConfig({
    format: ["esm","cjs"],
    entry: ['./src/index.ts'],
    outDir: "./dist",
    skipNodeModulesBundle: true,
    dts: true
});