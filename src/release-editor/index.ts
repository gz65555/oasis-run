import path from "path";
import fs from "fs-extra";
import { execCMD } from "../common/exec";
import chalk from "chalk";
import { commitAndTagUpdates, gitPushToRemote, queryTag, queryVersion, updatePackageVersions } from "../utils/utils";

export async function releaseEditor(tag?: string) {
  const cwd = process.cwd();

  const editorDir = path.join(cwd, "packages", "pages");

  if (!fs.existsSync(editorDir)) {
    console.log(chalk.red("错误：不是编辑器目录"));
    process.exit(1);
  }
  const currentVersion = require(path.join(editorDir, "package.json")).version;
  if (!tag) {
    tag = await queryTag();
  }
  const version = await queryVersion(currentVersion, tag);

  const files = await updatePackageVersions(version, [editorDir]);

  await buildPackage(cwd);

  await commitAndTagUpdates(files, version, cwd);

  const currentBranch = await execCMD("git", ["rev-parse", "--abbrev-ref", "HEAD"], cwd);

  await gitPushToRemote(currentBranch, cwd);

  await execCMD("tnpm", ["publish", "--tag", tag], editorDir, true);

  console.log(`open https://yuyan.antfin-inc.com/lib/version?name=%40alipay%2Foasis-editor-pages to publish cdn url`);
  console.log(`open https://github.com/ant-galaxy/editor/releases/new to generate release log`);
}
async function buildPackage(cwd: string) {
  await execCMD("yarn", ["workspace", "@oasis-editor/pages", "build"], cwd, true);
}
