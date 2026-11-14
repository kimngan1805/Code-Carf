import { describe, expect, it } from "vitest";
import { assertSameOrigin } from "./http";

describe("contest mutation origin", () => {
  it("accepts the public host when Next binds to an internal address", () => {
    const request = new Request(
      "http://0.0.0.0:3100/api/contests/demo/registration",
      {
        headers: { host: "localhost:3100", origin: "http://localhost:3100" },
      },
    );
    expect(() => assertSameOrigin(request)).not.toThrow();
  });
  it("supports HTTPS through a reverse proxy", () => {
    const request = new Request(
      "http://internal:3000/api/contests/demo/registration",
      {
        headers: {
          host: "code.example",
          origin: "https://code.example",
          "x-forwarded-proto": "https",
        },
      },
    );
    expect(() => assertSameOrigin(request)).not.toThrow();
  });
  it("rejects a cross-origin POST", () => {
    const request = new Request(
      "http://localhost:3000/api/contests/demo/registration",
      {
        headers: { host: "localhost:3000", origin: "https://example.invalid" },
      },
    );
    expect(() => assertSameOrigin(request)).toThrow();
  });
});
