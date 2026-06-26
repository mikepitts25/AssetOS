import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
  resolve: {
    alias: [
      // Neutralize the server-only Supabase client (pulls next/headers) so pure
      // modules that sit alongside DB code can be imported in a node test env.
      {
        find: "@/lib/supabase/server",
        replacement: fileURLToPath(
          new URL("./test/stubs/supabase-server.ts", import.meta.url),
        ),
      },
      { find: "@", replacement: fileURLToPath(new URL("./", import.meta.url)) },
    ],
  },
});
