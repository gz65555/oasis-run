#!/usr/bin/env node

import { prepareLink } from "./link/cli-prepare";
import { link } from "./link";
import { e2e } from "./e2e";
import { gen } from "./common";
import { onlyRelease, release } from "./release";
import { releaseNpm } from "./release-npm";
import semver from "semver";
import { clean } from "./clean";
import { watch } from "./watch";

const cli = require("cac")();
const pkg = require("../package.json");
const path = require("path");
const defaultDir = ".dragaux";
const defaultConfigFile = "config.js";

cli
  .command("e2e")
  .option("-r, --rule", "access rule")
  .action((files, options) => {
    const config = require(path.join(process.env.PWD, defaultDir, defaultConfigFile));
    const finalOptions = { expectedDir: path.join(process.env.PWD, defaultDir, "expected"), ...config };
    e2e(finalOptions);
  });
cli
  .command("gen")
  .option("-r, --rule", "access rule")
  .action(async (files, options) => {
    const config = require(path.join(process.env.PWD, defaultDir, defaultConfigFile));
    config.out = path.join(process.env.PWD, defaultDir, "expected", "<name>.png");
    const finalOptions = { expectedDir: path.join(process.env.PWD, defaultDir, "results"), ...config };
    gen(finalOptions).then((results) => {
      results.forEach(({ result, image }) => {
        const re = /([\s\S]+)====================== page\.goto logs ======================/;
        if (result.status !== "fulfilled") {
          const logMsg = result.reason.message.match(re)[1];
          console.log(image);
          console.error(logMsg);
        }
      });
    });
  });

cli
  .command("link [oasis-dir]", "link oasis root repo")
  .option("-c, --clear", "clear oasis root")
  .action((dir: string, options: { clear: undefined | boolean }) => {
    prepareLink(dir, options.clear)
      .then((oasisRoot) => link({ root: process.env.PWD, oasisRoot }))
      .catch((e: Error) => {
        console.error(e);
      });
  });

cli.command("watch", "fast watch oasis").action(() => {
  watch();
});

cli.command("release", "release oasis").action(() => {
  release();
});

cli.command("only-release", "only release").action(() => {
  onlyRelease();
});

cli.command("clean", "clean oasis package").action(() => {
  clean();
});

cli.command("release-npm [version]", "release oasis to npm").action((version: string, options: { version: string }) => {
  version = semver.valid(version);
  if (version != null) {
    releaseNpm(version);
  } else {
    throw new Error(`${version} is error`);
  }
});
// Display help message when `-h` or `--help` appears
cli.help();
// Display version number when `-v` or `--version` appears
// It's also used in help message
cli.version(pkg.version);
cli.parse();
