import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execCli } from "../cli.js";

export function registerLensTools(server: McpServer): void {
  server.tool(
    "panproto_lens_generate",
    "Auto-generate a bidirectional lens between two schemas",
    {
      src: z.string().describe("Path to source schema"),
      tgt: z.string().describe("Path to target schema"),
    },
    async ({ src, tgt }) => {
      const result = await execCli("lens", "generate", src, tgt);
      return { content: [{ type: "text" as const, text: result }] };
    }
  );

  server.tool(
    "panproto_lens_apply",
    "Apply a lens to data (get direction: project source to target)",
    {
      lens: z.string().describe("Path to lens file"),
      record: z.string().describe("Path to data record"),
    },
    async ({ lens, record }) => {
      const result = await execCli("lens", "apply", lens, record);
      return { content: [{ type: "text" as const, text: result }] };
    }
  );

  server.tool(
    "panproto_lens_verify",
    "Verify lens round-trip laws (GetPut and PutGet) on test data",
    {
      lens: z.string().describe("Path to lens file"),
      instance: z.string().describe("Path to test instance"),
    },
    async ({ lens, instance }) => {
      const result = await execCli(
        "lens",
        "verify",
        lens,
        "--instance",
        instance
      );
      return { content: [{ type: "text" as const, text: result }] };
    }
  );
}
