import chalk from "chalk";

const path = require("path");
const fs = require("fs");
const os = require("os");
import execa from "execa";

const CPU_LEN = os.cpus().length;

export async function execCMD(cmdText: string, options: string[], cwd: string, useOriginLog = false) {
  const commandText = chalk.blue(`${cmdText} ${options.join(" ")}`);
  console.log(`exec ${commandText}`);
  let output;
  const { stdout } = await execa(cmdText, options, { cwd, stdio: useOriginLog ? "inherit" : undefined });
  output = stdout;
  console.log(`finish exec ${cmdText} in ${cwd}: ${output}`);
  return output;
}

export async function divideExec(cmd: string, options: string[], basePackagePath: string) {
  const dividedPathes = [];

  const packagePathes = fs
    .readdirSync(basePackagePath)
    .map((p: string) => path.join(basePackagePath, p))
    .filter((p: string) => fs.statSync(p).isDirectory())
    .filter((p: string) => fs.existsSync(path.join(p, "package.json")));

  while (packagePathes.length > 0) {
    dividedPathes.push(packagePathes.splice(0, CPU_LEN));
  }
  for (let i = 0; i < dividedPathes.length; i++) {
    const itemPathes = dividedPathes[i];
    const promises = itemPathes.map((p) => execCMD(cmd, options, p));
    await Promise.all(promises);
  }
}
