import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

interface ExecOptions {
  cwd?: string;
}

/**
 * Execute the panproto CLI (`schema` command) and return stdout.
 * Throws on non-zero exit with stderr as the error message.
 */
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

  try {
    const { stdout } = await execFileAsync("schema", args, {
      cwd: options.cwd,
      timeout: 30_000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout.trim();
  } catch (error: unknown) {
    const execError = error as { stderr?: string; message?: string };
    throw new Error(
      execError.stderr?.trim() || execError.message || "CLI execution failed"
    );
  }
}
