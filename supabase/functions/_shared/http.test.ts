import { assert, assertFalse } from "jsr:@std/assert@1";
import { isInternalCall } from "./http.ts";

const req = (secret?: string) =>
	new Request("http://x", { headers: secret ? { "x-internal-secret": secret } : {} });

Deno.test("isInternalCall checks the shared secret", () => {
	Deno.env.set("INTERNAL_HOOK_SECRET", "s3cret-value");
	assert(isInternalCall(req("s3cret-value")));
	assertFalse(isInternalCall(req("s3cret-valuX")));
	assertFalse(isInternalCall(req("short")));
	assertFalse(isInternalCall(req()));
	Deno.env.delete("INTERNAL_HOOK_SECRET");
	assertFalse(isInternalCall(req("s3cret-value")));
});
