import chalk from "chalk";

const path = require("path");
const fs = require("fs");
const execa = require("execa");
const os = require("os");

const CPU_LEN = os.cpus().length;

export async function execCMD(cmdText: string, options: string[], cwd: string) {
  const commandText = chalk.blue(`${cmdText} ${options.join(" ")}`);
  console.log(`exec ${commandText}`);
  let output;
  try {
    const { stdout } = await execa(cmdText, options, { cwd });
    output = stdout;
    console.log(`finish exec ${cmdText} in ${cwd}: ${output}`);
    return output;
  } catch (e) {
    console.log(e);
  }
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
