#!/usr/bin/env node

import { createServer } from "./server.js";

async function main(): Promise<void> {
  const server = await createServer();
  await server.listen();
}

main().catch((error: unknown) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
