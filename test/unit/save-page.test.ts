import { describe, expect, it } from "vitest";

import { createPageSaver } from "../../service/pages/save-page";

type SupabaseError = { message: string };

function createSupabaseStub(error: SupabaseError | null) {
  const calls = {
    table: "",
    payload: null as Record<string, unknown> | null,
    eq: { column: "", value: "" },
  };

  const supabase = {
    from: (table: string) => ({
      update: (payload: Record<string, unknown>) => {
        calls.table = table;
        calls.payload = payload;
        return {
          eq: (column: string, value: string) => {
            calls.eq = { column, value };
            return { error };
          },
        };
      },
    }),
  };

  return { supabase, calls };
}

describe("createPageSaver", () => {
  it("normalizes the update payload and targets the page id", async () => {
    const { supabase, calls } = createSupabaseStub(null);
    const savePage = createPageSaver(Promise.resolve(supabase as never));

    await savePage({
      pageId: "page-123",
      title: null,
      description: null,
      image_url: null,
      layout: null,
    });

    expect(calls.table).toBe("pages");
    expect(calls.payload).toEqual({
      title: "",
      description: null,
      image_url: null,
    });
    expect(calls.eq).toEqual({ column: "id", value: "page-123" });
  });

  it("throws when the update fails", async () => {
    const { supabase } = createSupabaseStub({ message: "boom" });
    const savePage = createPageSaver(Promise.resolve(supabase as never));

    await expect(
      savePage({
        pageId: "page-999",
        title: "Title",
        description: "Desc",
        image_url: "https://example.com/image.png",
        layout: null,
      })
    ).rejects.toThrow("boom");
  });
});
