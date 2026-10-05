import { spawn, type ChildProcess } from "node:child_process";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const PORT = 19080;
const DB = "/tmp/weather-it.db";
const READY_URL = `http://localhost:${PORT}/api/weather/freshness`;

let proc: ChildProcess | undefined;
let exited = false;
let tail = "";

async function ready(): Promise<boolean> {
  try {
    return (await fetch(READY_URL)).ok;
  } catch {
    return false;
  }
}

export async function setup() {
  // Point IT_BASE_URL at an already running backend to skip starting one.
  if (process.env["IT_BASE_URL"]) return;

  for (const suffix of ["", "-journal", "-wal", "-shm"]) rmSync(DB + suffix, { force: true });

  proc = spawn("./mvnw", ["-B", "spring-boot:run"], {
    cwd: fileURLToPath(new URL("../backend", import.meta.url)),
    env: {
      ...process.env,
      PORT: String(PORT),
      SPRING_PROFILES_ACTIVE: "dev",
      DB_PATH: DB,
      SEED_ENABLED: "true",
      APP_WEATHER_SCHEDULER_ENABLED: "false",
      // Closed port: upstream refreshes fail fast, so the suite never touches the real Open-Meteo.
      OPEN_METEO_BASE_URL: "http://127.0.0.1:9",
    },
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const collect = (chunk: Buffer) => {
    tail = (tail + chunk.toString()).slice(-6000);
  };
  proc.stdout?.on("data", collect);
  proc.stderr?.on("data", collect);
  proc.on("exit", () => {
    exited = true;
  });

  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    if (exited) throw new Error(`Backend exited during startup. Last output:\n${tail}`);
    if (await ready()) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Backend did not become ready in time. Last output:\n${tail}`);
}

export async function teardown() {
  // The process group also contains the JVM that Maven forks.
  if (proc?.pid) {
    try {
      process.kill(-proc.pid, "SIGTERM");
    } catch {
      /* already gone */
    }
  }
}