import path from "path";
import esbuild from "esbuild";
import fs from "fs-extra";

export function watch() {
  const cwd = process.cwd();
  const pkgsRoot = path.join(cwd, "packages");

  fs.readdirSync(pkgsRoot)
    .filter((dir) => dir !== "design")
    .map((dir) => path.join(pkgsRoot, dir))
    .filter((dir) => fs.statSync(dir).isDirectory())
    .map((location) => {
      return {
        location: location,
        pkgJson: path.join(location, "package.json")
      };
    })
    .forEach((item) => {
      const pkg = require(item.pkgJson);
      const entryPoint = path.join(item.location, "src/index.ts");
      const outFile = path.join(item.location, pkg.module);
      const start = performance.now();
      esbuild
        .build({
          entryPoints: [entryPoint],
          loader: {
            ".glsl": "text",
            ".wasm": "binary"
          },
          outfile: outFile,
          watch: {
            onRebuild(error) {
              if (error) {
                console.error("watch build failed:", error);
              } else {
                console.log("\x1B[32watch build succeeded");
              }
            }
          },
          format: "esm",
          bundle: true,
          external: Object.keys(
            Object.assign(pkg.dependencies ?? {}, pkg.peerDependencies ?? {}, pkg.devDependencies ?? {})
          )
        })
        .then(() => {
          const duration = performance.now() - start;
          console.log(`\x1B[32mcreated ${pkg.module} in ${duration.toFixed(2)}ms\x1b[0m`);
          console.log(`\x1B[36m${entryPoint} → ${pkg.module}\x1b[0m`);
        });
    });
}
