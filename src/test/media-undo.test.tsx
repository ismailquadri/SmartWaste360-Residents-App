import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MEDIA_UNDO_MS, restoreMedia, useMediaUndo } from "@/hooks/use-media-undo";

afterEach(() => vi.useRealTimers());

describe("Report media undo", () => {
  it("keeps a deleted audio blob playable and restores its duration", () => {
    const release = vi.fn();
    const { result } = renderHook(() => useMediaUndo<{ url: string; seconds: number }>(release));
    act(() => result.current.remove({ url: "blob:audio", seconds: 12 }));
    expect(release).not.toHaveBeenCalled();
    let restored;
    act(() => { restored = result.current.restore(); });
    expect(restored).toEqual([{ item: { url: "blob:audio", seconds: 12 }, index: 0 }]);
    expect(result.current.pending).toHaveLength(0);
    expect(release).not.toHaveBeenCalled();
  });

  it("releases a deleted video only after the ten-second undo window", () => {
    vi.useFakeTimers();
    const release = vi.fn();
    const { result } = renderHook(() => useMediaUndo<string>(release));
    act(() => result.current.remove("blob:video"));
    act(() => vi.advanceTimersByTime(MEDIA_UNDO_MS - 1));
    expect(release).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(release).toHaveBeenCalledExactlyOnceWith("blob:video");
    expect(result.current.pending).toHaveLength(0);
  });

  it("restores multiple attachments in their original order", () => {
    expect(restoreMedia(["third"], [{ item: "first", index: 0 }, { item: "second", index: 0 }])).toEqual(["first", "second", "third"]);
  });

  it("releases un-restored clips on leaving the report", () => {
    const release = vi.fn();
    const { result, unmount } = renderHook(() => useMediaUndo<string>(release));
    act(() => result.current.remove("blob:discarded"));
    unmount();
    expect(release).toHaveBeenCalledExactlyOnceWith("blob:discarded");
  });
});