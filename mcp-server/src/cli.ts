import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const DEBUG = process.env.DEBUG?.includes("panproto") ?? false;

interface ExecOptions {
  cwd?: string;
  timeout?: number;
}

export async function execCli(
  ...argsAndOptions: Array<string | ExecOptions>
): Promise<string> {
  const options: ExecOptions = {};
  const args: string[] = [];

  for (const item of argsAndOptions) {
    if (typeof item === "string") {
      args.push(item);
    } else {
      Object.assign(options, item);
    }
  }

  if (DEBUG) {
    console.error(`[panproto] schema ${args.join(" ")}`);
  }

  try {
    const { stdout } = await execFileAsync("schema", args, {
      cwd: options.cwd,
      timeout: options.timeout ?? 30_000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout.trim();
  } catch (error: unknown) {
    const message = extractErrorMessage(error);
    if (DEBUG) {
      console.error(`[panproto] error: ${message}`);
    }
    throw new Error(message);
  }
}

export async function execCliJson<T = unknown>(
  ...argsAndOptions: Array<string | ExecOptions>
): Promise<T> {
  const raw = await execCli(...argsAndOptions);
  return JSON.parse(raw) as T;
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const execError = error as Error & { stderr?: string; code?: number };
    if (execError.stderr?.trim()) {
      return execError.stderr.trim();
    }
    return execError.message;
  }
  return "CLI execution failed";
}

export function textContent(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

export function withErrorBoundary<T extends Record<string, unknown>>(
  fn: (args: T) => Promise<{ content: Array<{ type: "text"; text: string }>; structuredContent?: Record<string, unknown> }>
): (args: T, extra?: unknown) => Promise<{ content: Array<{ type: "text"; text: string }>; structuredContent?: Record<string, unknown> }> {
  return async (args: T) => {
    try {
      return await fn(args);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      return textContent(`Error: ${message}`);
    }
  };
}
