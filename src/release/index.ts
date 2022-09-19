import path from "path";
import fs from "fs-extra";
import inquirer from "inquirer";
import { divideExec, execCMD } from "../common/exec";
import { spawn } from "child_process";
import * as semver from "semver";
import chalk from "chalk";

function buildPackage(cwd: string) {
  return new Promise<void>((resolve, reject) => {
    const buildCMD = spawn("npm", ["run", "b:all"], { cwd });
    buildCMD.stdout.on("data", function (data) {
      // console.log(data.toString());
    });

    buildCMD.stderr.on("data", function (data) {
      console.log(data.toString());
    });

    buildCMD.on("exit", function (code) {
      if (code !== 0) {
        reject(new Error("npm run b:all exited with code " + code));
      } else {
        resolve();
      }
      console.log("child process exited with code " + code.toString());
    });
  });
}

export async function release() {
  const cwd = process.cwd();

  const basePackagePath = path.join(cwd, "packages");

  if (!fs.existsSync(basePackagePath)) {
    console.log(chalk.red("错误：当前目录不是 monorepo 项目"));
    process.exit(1);
  }
  const dirs = fs.readdirSync(basePackagePath);

  const currentVersion = require(path.join(basePackagePath, dirs[0], "package.json")).version;
  const tag = await queryTag();
  const version = await queryVersion(currentVersion, tag);

  await buildPackage(cwd);

  const files = await updatePackageVersions(
    version,
    dirs.map((dir) => path.join(basePackagePath, dir))
  );

  await commitAndTagUpdates(files, version, cwd);

  await gitPushToRemote(cwd);

  divideExec("pnpm", ["publish", "--tag", tag], basePackagePath);
}

export async function onlyRelease() {
  const cwd = process.cwd();
  const tag = await queryTag();
  const basePackagePath = path.join(cwd, "packages");
  divideExec(`pnpm`, ["publish", "--tag", tag], basePackagePath);
}

async function queryTag() {
  const { tag, customTag } = await inquirer.prompt([
    {
      name: "tag",
      type: "list",
      choices: ["latest", "alpha", "beta", "Custom Tag"],
      message: "选择发布的 tag"
    },
    {
      name: "customTag",
      message: "请输入自定义的 tag",
      when: ({ tag }) => {
        return tag === "Custom Tag";
      },
      default: "latest"
    }
  ]);
  return customTag ?? tag;
}

async function queryVersion(currentVersion: string, tag: string) {
  const { version, customVersion, confirm } = await inquirer.prompt([
    {
      name: "version",
      type: "list",
      choices: ["Prerelease", "Minor", "Major", "Custom Version"],
      message: "选择版本升级方式"
    },
    {
      name: "customVersion",
      message: "请输入自定义的 version",
      when: ({ version }) => {
        return version === "Custom Version";
      },
      validate: (input) => {
        if (semver.valid(input)) {
          return true;
        }
        return `The version: ${input} is not valid`;
      },
      default: ""
    },
    {
      name: "confirm",
      type: "confirm",
      message: function ({ version, customVersion }) {
        const targetVersion = customVersion ?? semver.inc(currentVersion, version.toLowerCase(), tag);
        return `确认版本升级：${chalk.green(currentVersion)} -> ${chalk.green(targetVersion)}`;
      }
    }
  ]);
  if (!confirm) {
    return queryVersion(currentVersion, tag);
  } else {
    return customVersion ?? semver.inc(currentVersion, version.toLowerCase(), tag);
  }
}

async function updatePackageVersions(version: string, dirs: string[]) {
  return Promise.all(
    dirs.map(async (dir) => {
      const pkgPath = path.join(dir, "package.json");
      const pkgContent = await fs.readJSON(pkgPath, { encoding: "utf-8" });
      pkgContent.version = version;
      await fs.writeJSON(pkgPath, pkgContent, { spaces: 2 });
      return pkgPath;
    })
  );
}

async function commitAndTagUpdates(files: string[], version: string, cwd: string) {
  await execCMD("git", ["add", ...files.map((file) => path.relative(cwd, file))], cwd);
  await execCMD("git", ["commit", "-m", `"v${version}"`, "--no-verify"], cwd);
  await execCMD("git", ["tag", `v${version}`, "-m", `v${version}`], cwd);
}

async function gitPushToRemote(cwd: string) {
  const currentBranch = await execCMD("git", ["rev-parse", "--abbrev-ref", "HEAD"], cwd);
  const remote = "origin";
  await execCMD("git", ["push", remote, currentBranch], cwd);
}
