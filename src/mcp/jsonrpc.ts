/**
 * Minimal JSON-RPC 2.0 over stdio — the transport for parrot's MCP server (C1, PLAN §3 Component 7).
 *
 * WHY hand-rolled, not `@modelcontextprotocol/sdk`: the repo's deliberate taste is zero runtime deps beyond
 * commander (B3 ships a zero-dep ICU inspector rather than FormatJS's NAPI parser for the same reason — P25);
 * the SDK pulls a heavy transitive tree that slows `pnpm install` and can break in bare-Node sandboxes. The
 * MCP contract C1 must satisfy (stdio JSON-RPC `tools/list` + `tools/call` + `resources/list`/`resources/read`
 * + `initialize`) is small and stable enough to implement directly (Simplicity First). The line protocol is
 * newline-delimited JSON (LSP-style Content-Length framing is NOT required for the stdio dev-tool case the
 * checklist permits — HARNESS-OVERRIDES §7 "stdio-local sufficient for C1").
 *
 * This file is the TRANSPORT only (parse a request line → dispatch to a handler → write a response line). The
 * parrot tool/resource semantics live in `server.ts`. Pure, dependency-free, never throws across the boundary.
 */

import { createInterface } from "node:readline";

/** A parsed JSON-RPC 2.0 request. `id` is absent for notifications (we don't reply to those). */
export interface JsonRpcRequest {
  readonly jsonrpc: "2.0";
  readonly id?: string | number | null;
  readonly method: string;
  readonly params?: Record<string, unknown>;
}

/** A JSON-RPC 2.0 success/error response. */
export interface JsonRpcResponse {
  readonly jsonrpc: "2.0";
  readonly id: string | number | null;
  readonly result?: unknown;
  readonly error?: { readonly code: number; readonly message: string; readonly data?: unknown };
}

/** Standard JSON-RPC error codes (subset we use). */
export const JSONRPC_ERR = {
  PARSE: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL: -32603,
} as const;

/** A method handler: receives params, returns the `result` payload (or throws to produce an error response). */
export type RpcHandler = (params: Record<string, unknown>) => Promise<unknown> | unknown;

/** Build a success response. */
export function ok(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

/** Build an error response. */
export function err(id: string | number | null, code: number, message: string, data?: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: data === undefined ? { code, message } : { code, message, data } };
}

/**
 * Run a JSON-RPC stdio loop: read newline-delimited request objects from `input`, dispatch each `method` to
 * its registered handler, and write the response object as one line to `output`. Notifications (no `id`) get
 * no reply, per spec. A handler throwing produces a JSON-RPC error response (the loop never crashes on a bad
 * request — robustness is required for an agent transport).
 */
export function serveStdio(
  handlers: Readonly<Record<string, RpcHandler>>,
  input: NodeJS.ReadableStream = process.stdin,
  output: NodeJS.WritableStream = process.stdout,
): void {
  const rl = createInterface({ input, terminal: false });
  const write = (resp: JsonRpcResponse): void => {
    output.write(JSON.stringify(resp) + "\n");
  };

  rl.on("line", (line) => {
    void handleLine(line, handlers, write);
  });
}

/** Handle one request line. Exported for unit tests (so the protocol can be exercised without real stdio). */
export async function handleLine(
  line: string,
  handlers: Readonly<Record<string, RpcHandler>>,
  write: (resp: JsonRpcResponse) => void,
): Promise<void> {
  const trimmed = line.trim();
  if (trimmed.length === 0) return;

  let req: JsonRpcRequest;
  try {
    req = JSON.parse(trimmed) as JsonRpcRequest;
  } catch {
    write(err(null, JSONRPC_ERR.PARSE, "Parse error: invalid JSON"));
    return;
  }

  if (req.jsonrpc !== "2.0" || typeof req.method !== "string") {
    write(err(req.id ?? null, JSONRPC_ERR.INVALID_REQUEST, "Invalid Request: missing jsonrpc/method"));
    return;
  }

  const isNotification = req.id === undefined;
  const handler = handlers[req.method];
  if (!handler) {
    // Per spec, do not reply to a notification — even an unknown one.
    if (!isNotification) write(err(req.id ?? null, JSONRPC_ERR.METHOD_NOT_FOUND, `Method not found: ${req.method}`));
    return;
  }

  try {
    const result = await handler(req.params ?? {});
    if (!isNotification) write(ok(req.id ?? null, result));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (!isNotification) write(err(req.id ?? null, JSONRPC_ERR.INTERNAL, message));
  }
}
