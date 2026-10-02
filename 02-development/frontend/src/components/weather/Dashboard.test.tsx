import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setApi } from "@/services";
import { createMockApi, DEFAULT_VIEW_CONFIG, memoryStore } from "@/services/mock/mockApi";
import { Dashboard } from "./Dashboard";

function renderDashboard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: () => <Dashboard initialConfig={DEFAULT_VIEW_CONFIG} /> });
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory({ initialEntries: ["/"] }) });
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => setApi(createMockApi({ store: memoryStore() })));
afterEach(cleanup);

describe("Dashboard", () => {
  it("shows a temporary view with current conditions and insights for the mock backend", async () => {
    renderDashboard();
    expect(await screen.findByText("Temporary view")).toBeInTheDocument();
    expect(await screen.findByText("Lisbon, Portugal")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Insights" })).toBeInTheDocument();
  });

  it("removes a city when its chip is closed", async () => {
    renderDashboard();
    const btn = await screen.findByLabelText("Remove London");
    fireEvent.click(btn);
    await waitFor(() => expect(screen.queryByLabelText("Remove London")).not.toBeInTheDocument());
  });

  it("toggles a metric", async () => {
    renderDashboard();
    const snow = await screen.findByRole("button", { name: "Snowfall" });
    expect(snow).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(snow);
    expect(screen.getAllByRole("button", { name: "Snowfall" })[0]).toHaveAttribute("aria-pressed", "true");
  });
});
