import { execFileSync } from "child_process";
import path from "path";

describe("architecture guardrails", () => {
  test("architecture check passes for the current repository", () => {
    expect(() => {
      execFileSync("node", [path.join(process.cwd(), "scripts/tools/architecture-check.js")], {
        cwd: process.cwd(),
        stdio: "pipe",
      });
    }).not.toThrow();
  });
});
