import "dotenv/config";
import { createClient } from "redis";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { prisma } from "./db.js";

const dir = path.join(import.meta.dirname, "code");
fs.mkdirSync(dir, { recursive: true });

const isWindows = process.platform === "win32";

function run(command: string, args: string[]): Promise<{ exitCode: number | null; output: string }> {
  return new Promise((resolve) => {
    let output = "";
    const child = spawn(command, args, { timeout: 5000 });
    child.stdout.on("data", (c) => (output += c.toString()));
    child.stderr.on("data", (c) => (output += c.toString()));
    child.on("error", (err) => resolve({ exitCode: -1, output: output + err.message }));
    child.on("close", (exitCode, signal) => {
      if (signal) output += "\nTime limit exceeded";
      resolve({ exitCode, output });
    });
  });
}

async function execute(language: string, code: string) {
  if (language === "cpp") {
    const src = path.join(dir, "a.cpp");
    const out = path.join(dir, isWindows ? "out.exe" : "out");
    fs.writeFileSync(src, code);
    const compiled = await run("g++", [src, "-o", out]);
    if (compiled.exitCode !== 0) return compiled;
    return run(out, []);
  }

  if (language === "js") {
    const src = path.join(dir, "a.js");
    fs.writeFileSync(src, code);
    return run("node", [src]);
  }

  if (language === "py") {
    const src = path.join(dir, "a.py");
    fs.writeFileSync(src, code);
    return run(isWindows ? "python" : "python3", [src]);
  }

  return { exitCode: -1, output: "Unsupported language" };
}

const client = createClient();
client.on("error", (e) => console.log("Redis error", e));

async function main() {
  await client.connect();
  console.log("worker started");

  while (true) {
    const response = await client.rPop("problems");
    if (!response) {
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }

    const { submissionId, code, language } = JSON.parse(response);
    console.log("processing", submissionId, language);

    try {
      const result = await execute(language, code);
      await prisma.submissions.update({
        where: { id: submissionId },
        data: {
          status: result.exitCode === 0 ? "Success" : "Failure",
          output: result.output,
        },
      });
    } catch (e) {
      console.log(e);
      await prisma.submissions.update({
        where: { id: submissionId },
        data: { status: "Failure", output: "Worker error" },
      });
    }
  }
}

main();