import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadReferenceImage } from "./dalle2-provider";
import { readFileSync } from "fs";
import { join } from "path";

vi.mock("fs");

// Mock global fetch
global.fetch = vi.fn();

describe("loadReferenceImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw an error for path traversal attempts with ..", async () => {
    await expect(loadReferenceImage("../../etc/passwd")).rejects.toThrow("Invalid reference image URL");
    await expect(loadReferenceImage("../package.json")).rejects.toThrow("Invalid reference image URL");
  });

  it("should throw an error for paths that resolve outside public", async () => {
    await expect(loadReferenceImage("../../../etc/passwd")).rejects.toThrow("Invalid reference image URL");
  });

  it("should throw an error for paths that resolve to the public directory itself", async () => {
    await expect(loadReferenceImage("")).rejects.toThrow("Invalid reference image URL");
    await expect(loadReferenceImage("/")).rejects.toThrow("Invalid reference image URL");
    await expect(loadReferenceImage(".")).rejects.toThrow("Invalid reference image URL");
  });

  it("should allow valid paths within the public directory", async () => {
    const validUrl = "generated/test.png";
    vi.mocked(readFileSync).mockReturnValue(Buffer.from("fake image data"));

    await loadReferenceImage(validUrl);

    expect(readFileSync).toHaveBeenCalledWith(expect.stringContaining(join("public", "generated", "test.png")));
  });

  it("should handle leading slashes correctly and safely", async () => {
    const validUrl = "/generated/test.png";
    vi.mocked(readFileSync).mockReturnValue(Buffer.from("fake image data"));

    await loadReferenceImage(validUrl);

    expect(readFileSync).toHaveBeenCalledWith(expect.stringContaining(join("public", "generated", "test.png")));
  });

  it("should handle absolute-looking paths by keeping them within public", async () => {
    const url = "/etc/passwd"; // becomes etc/passwd relative to public
    vi.mocked(readFileSync).mockReturnValue(Buffer.from("fake image data"));

    await loadReferenceImage(url);

    expect(readFileSync).toHaveBeenCalledWith(expect.stringContaining(join("public", "etc", "passwd")));
  });
});
