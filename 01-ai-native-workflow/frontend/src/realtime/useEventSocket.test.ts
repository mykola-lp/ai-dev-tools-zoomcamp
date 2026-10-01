import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useEventSocket } from "./useEventSocket";

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static OPEN = 1;
  static CLOSED = 3;

  url: string;
  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  close(): void {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  }

  triggerOpen(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  triggerMessage(data: string): void {
    this.onmessage?.({ data });
  }

  triggerClose(): void {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  }
}

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.stubGlobal("WebSocket", FakeWebSocket);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useEventSocket", () => {
  it("does not connect without a token", () => {
    renderHook(() => useEventSocket(null));

    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  it("connects with the token in the URL", () => {
    renderHook(() => useEventSocket("abc123"));

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0].url).toContain("token=abc123");
  });

  it("delivers a parsed event to a subscriber", async () => {
    const { result } = renderHook(() => useEventSocket("abc123"));
    const handler = vi.fn();
    act(() => {
      result.current.subscribe(handler);
    });

    const socket = FakeWebSocket.instances[0];
    act(() => socket.triggerOpen());
    act(() => socket.triggerMessage(JSON.stringify({ type: "assignment.created", payload: { id: 1 } })));

    expect(handler).toHaveBeenCalledWith({ type: "assignment.created", payload: { id: 1 } });
  });

  it("ignores malformed messages", () => {
    const { result } = renderHook(() => useEventSocket("abc123"));
    const handler = vi.fn();
    act(() => {
      result.current.subscribe(handler);
    });

    const socket = FakeWebSocket.instances[0];
    act(() => socket.triggerOpen());
    act(() => socket.triggerMessage("not json"));

    expect(handler).not.toHaveBeenCalled();
  });

  it("reconnects after a close", () => {
    renderHook(() => useEventSocket("abc123"));
    const firstSocket = FakeWebSocket.instances[0];
    act(() => firstSocket.triggerOpen());
    act(() => firstSocket.triggerClose());

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it("reconnects when the token changes", () => {
    const { rerender } = renderHook(({ token }) => useEventSocket(token), {
      initialProps: { token: "token-a" as string | null },
    });
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0].url).toContain("token=token-a");

    rerender({ token: "token-b" });

    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(FakeWebSocket.instances[1].url).toContain("token=token-b");
  });

  it("closes the socket on unmount", () => {
    const { unmount } = renderHook(() => useEventSocket("abc123"));
    const socket = FakeWebSocket.instances[0];
    const closeSpy = vi.spyOn(socket, "close");

    unmount();

    expect(closeSpy).toHaveBeenCalled();
  });
});
