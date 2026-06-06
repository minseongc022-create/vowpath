import { rmSync } from "fs";
import { spawn } from "child_process";

try {
  rmSync(".next", { recursive: true, force: true });
  console.log("Removed .next cache");
} catch {
  console.log("No .next folder to remove");
}

const child = spawn("npx", ["next", "dev"], {
  stdio: "inherit",
  shell: true,
  cwd: process.cwd(),
});

child.on("exit", (code) => process.exit(code ?? 0));
