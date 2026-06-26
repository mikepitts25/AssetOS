// Test stub for @/lib/supabase/server. Unit tests exercise pure logic and must
// never reach the database; importing the real client pulls in next/headers,
// which isn't available in a node test environment.
export function createClient(): never {
  throw new Error("supabase server client is not available in unit tests");
}
