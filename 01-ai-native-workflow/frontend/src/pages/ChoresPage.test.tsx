import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listActiveChores, listProposedChores, proposeChore } from "../api/chores";
import { useAuth } from "../auth/useAuth";
import { useRealtime } from "../realtime/useRealtime";
import ChoresPage from "./ChoresPage";

vi.mock("../api/chores", () => ({
  listActiveChores: vi.fn(),
  listProposedChores: vi.fn(),
  proposeChore: vi.fn(),
}));

vi.mock("../auth/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../realtime/useRealtime", () => ({
  useRealtime: vi.fn(),
}));

const activeChore = {
  id: 1,
  title: "Wash dishes",
  description: null,
  period: "daily" as const,
  weight: 3,
  status: "active" as const,
  proposed_by_id: 2,
};

const myProposal = {
  id: 2,
  title: "Mow the lawn",
  description: "Front yard",
  period: "weekly" as const,
  weight: 5,
  status: "proposed" as const,
  proposed_by_id: 1,
};

const otherProposal = {
  id: 3,
  title: "Clean garage",
  description: null,
  period: "monthly" as const,
  weight: 4,
  status: "proposed" as const,
  proposed_by_id: 2,
};

beforeEach(() => {
  vi.mocked(listActiveChores).mockReset();
  vi.mocked(listProposedChores).mockReset();
  vi.mocked(proposeChore).mockReset();
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 1, email: "me@example.com", display_name: "Me", role: "member", status: "approved" },
    token: "test-token",
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  });
  vi.mocked(useRealtime).mockReturnValue({
    state: "open",
    subscribe: vi.fn(() => () => {}),
  });
});

describe("ChoresPage", () => {
  it("renders the active chores list", async () => {
    vi.mocked(listActiveChores).mockResolvedValue([activeChore]);
    vi.mocked(listProposedChores).mockResolvedValue([]);

    render(<ChoresPage />);

    await waitFor(() => {
      expect(screen.getByText("Wash dishes")).toBeInTheDocument();
    });
  });

  it("shows a validation error for an empty title", async () => {
    const user = userEvent.setup();
    vi.mocked(listActiveChores).mockResolvedValue([]);
    vi.mocked(listProposedChores).mockResolvedValue([]);

    render(<ChoresPage />);
    await waitFor(() => screen.getByText("No active chores"));

    await user.click(screen.getByRole("button", { name: "Propose" }));

    expect(await screen.findByText("Title is required")).toBeInTheDocument();
    expect(proposeChore).not.toHaveBeenCalled();
  });

  it("shows a validation error for weight out of range", async () => {
    const user = userEvent.setup();
    vi.mocked(listActiveChores).mockResolvedValue([]);
    vi.mocked(listProposedChores).mockResolvedValue([]);

    render(<ChoresPage />);
    await waitFor(() => screen.getByText("No active chores"));

    await user.type(screen.getByLabelText("Title"), "Wash dishes");
    await user.clear(screen.getByLabelText("Weight"));
    await user.type(screen.getByLabelText("Weight"), "15");
    await user.click(screen.getByRole("button", { name: "Propose" }));

    expect(
      await screen.findByText("Weight must be a whole number between 1 and 10"),
    ).toBeInTheDocument();
    expect(proposeChore).not.toHaveBeenCalled();
  });

  it("submits and refetches on success", async () => {
    const user = userEvent.setup();
    vi.mocked(listActiveChores).mockResolvedValue([]);
    vi.mocked(listProposedChores)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([myProposal]);
    vi.mocked(proposeChore).mockResolvedValue(myProposal);

    render(<ChoresPage />);
    await waitFor(() => screen.getByText("No active chores"));

    await user.type(screen.getByLabelText("Title"), "Mow the lawn");
    await user.type(screen.getByLabelText("Description"), "Front yard");
    await user.selectOptions(screen.getByLabelText("Period"), "weekly");
    await user.clear(screen.getByLabelText("Weight"));
    await user.type(screen.getByLabelText("Weight"), "5");
    await user.click(screen.getByRole("button", { name: "Propose" }));

    await waitFor(() => {
      expect(proposeChore).toHaveBeenCalledWith({
        title: "Mow the lawn",
        description: "Front yard",
        period: "weekly",
        weight: 5,
      });
      expect(listProposedChores).toHaveBeenCalledTimes(2);
    });
  });

  it("shows only the current user's proposals", async () => {
    vi.mocked(listActiveChores).mockResolvedValue([]);
    vi.mocked(listProposedChores).mockResolvedValue([myProposal, otherProposal]);

    render(<ChoresPage />);

    await waitFor(() => {
      expect(screen.getByText(/Mow the lawn/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Clean garage/)).not.toBeInTheDocument();
  });
});
