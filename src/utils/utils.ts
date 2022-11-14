import inquirer from "inquirer";
import chalk from "chalk";
import path from "path";
import * as semver from "semver";
import { execCMD } from "../common/exec";
import fs from "fs-extra";

export async function queryTag() {
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

export async function queryVersion(currentVersion: string, tag: string) {
  const { version, customVersion, confirm } = await inquirer.prompt([
    {
      name: "version",
      type: "list",
      choices: ["Prerelease", "Minor", "Major", "Patch", "Custom Version"],
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

export async function commitAndTagUpdates(files: string[], version: string, cwd: string) {
  const tag = `v${version}`;
  await execCMD("git", ["add", ...files.map((file) => path.relative(cwd, file))], cwd);
  await execCMD("git", ["commit", "-m", `"${tag}"`, "--no-verify"], cwd);
  await execCMD("git", ["tag", tag, "-m", tag], cwd);
  await execCMD("git", ["push", "origin", tag], cwd);
}

export async function updatePackageVersions(version: string, dirs: string[]) {
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

export async function gitPushToRemote(currentBranch: string, cwd: string) {
  const remote = "origin";
  await execCMD("git", ["push", remote, currentBranch], cwd);
}
