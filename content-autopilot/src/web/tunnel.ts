import { spawn, type ChildProcess } from "node:child_process";
import { log } from "../lib/utils.ts";

export type TunnelInfo = {
  url: string;
  provider: "cloudflared" | "localtunnel";
  process: ChildProcess;
};

/** Start a public HTTPS tunnel to the local dashboard (works on mobile data). */
export async function startPublicTunnel(port: number): Promise<TunnelInfo> {
  try {
    return await startCloudflared(port);
  } catch (e) {
    log("warn", "cloudflared failed, trying localtunnel", e);
    return startLocaltunnel(port);
  }
}

function startCloudflared(port: number): Promise<TunnelInfo> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      ["--yes", "cloudflared", "tunnel", "--url", `http://127.0.0.1:${port}`],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill();
        reject(new Error("cloudflared timeout"));
      }
    }, 45000);

    const onData = (buf: Buffer) => {
      const text = buf.toString();
      process.stderr.write(text);
      const m = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (m && !settled) {
        settled = true;
        clearTimeout(timeout);
        resolve({ url: m[0], provider: "cloudflared", process: child });
      }
    };

    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.on("error", (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(err);
      }
    });
    child.on("exit", (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(new Error(`cloudflared exited ${code}`));
      }
    });
  });
}

function startLocaltunnel(port: number): Promise<TunnelInfo> {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["--yes", "localtunnel", "--port", String(port)], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill();
        reject(new Error("localtunnel timeout"));
      }
    }, 45000);

    const onData = (buf: Buffer) => {
      const text = buf.toString();
      process.stderr.write(text);
      const m = text.match(/https:\/\/[a-z0-9-]+\.loca\.lt/);
      if (m && !settled) {
        settled = true;
        clearTimeout(timeout);
        resolve({ url: m[0], provider: "localtunnel", process: child });
      }
    };

    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.on("error", (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(err);
      }
    });
  });
}
