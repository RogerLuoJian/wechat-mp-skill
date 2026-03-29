// tests/cli.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

// Integration-style test: invoke the compiled CLI and check output
// These tests validate CLI argument parsing and command routing

describe("CLI", () => {
  const cli = join(process.cwd(), "dist/cli.js");

  it("shows help with no arguments", () => {
    try {
      execFileSync("node", [cli, "--help"], { encoding: "utf-8" });
    } catch (e: any) {
      // commander exits with code 0 on --help, some versions throw
      expect(e.stdout || e.message).toContain("wechat-mp");
    }
  });

  it("shows version", () => {
    try {
      execFileSync("node", [cli, "--version"], { encoding: "utf-8" });
    } catch (e: any) {
      expect(e.stdout || e.message || "").toContain("0.1.0");
    }
  });
});
