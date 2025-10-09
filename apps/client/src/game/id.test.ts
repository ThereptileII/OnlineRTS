import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("generateId", () => {
  it("uses the secure nanoid implementation when available", async () => {
    const secureMock = vi.fn(() => "secure-id");
    const fallbackMock = vi.fn(() => "fallback-id");

    vi.doMock("nanoid", () => ({ nanoid: secureMock }));
    vi.doMock("nanoid/non-secure", () => ({ nanoid: fallbackMock }));

    const { generateId } = await import("./id");

    expect(generateId(6)).toBe("secure-id");
    expect(secureMock).toHaveBeenCalledTimes(2);
    expect(secureMock).toHaveBeenLastCalledWith(6);
    expect(fallbackMock).not.toHaveBeenCalled();
  });

  it("falls back to the non-secure nanoid implementation when secure generation fails", async () => {
    const secureMock = vi.fn(() => {
      throw new Error("insecure context");
    });
    const fallbackMock = vi.fn(() => "fallback-id");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    vi.doMock("nanoid", () => ({ nanoid: secureMock }));
    vi.doMock("nanoid/non-secure", () => ({ nanoid: fallbackMock }));

    const { generateId } = await import("./id");

    expect(generateId(10)).toBe("fallback-id");
    expect(secureMock).toHaveBeenCalledTimes(1);
    expect(secureMock).toHaveBeenCalledWith(4);
    expect(fallbackMock).toHaveBeenCalledTimes(1);
    expect(fallbackMock).toHaveBeenCalledWith(10);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
