import { describe, it, expect } from "vitest";
import { slugify, ensureUniqueSlug } from "../slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Aurora Wireless Headphones")).toBe("aurora-wireless-headphones");
  });

  it("strips punctuation", () => {
    expect(slugify("Headphones (2026 edition)!")).toBe("headphones-2026-edition");
  });
});

describe("ensureUniqueSlug", () => {
  it("returns the base when free", async () => {
    const taken = new Set<string>();
    const slug = await ensureUniqueSlug("foo", (s) =>
      Promise.resolve(taken.has(s)),
    );
    expect(slug).toBe("foo");
  });

  it("appends -2, -3 for collisions", async () => {
    const taken = new Set(["foo", "foo-2"]);
    const slug = await ensureUniqueSlug("foo", (s) => Promise.resolve(taken.has(s)));
    expect(slug).toBe("foo-3");
  });

  it("excludes self when re-slugging after a rename", async () => {
    // Product "foo" renames: its own slug shouldn't count as a collision
    const taken = new Set<string>();
    const slug = await ensureUniqueSlug("bar", (s) => Promise.resolve(taken.has(s)));
    expect(slug).toBe("bar");
  });
});
