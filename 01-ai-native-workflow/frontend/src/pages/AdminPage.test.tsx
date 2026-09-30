import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  approveChore,
  approveUser,
  listPendingUsers,
  listProposedChores,
  rejectUser,
} from "../api/admin";
import AdminPage from "./AdminPage";

vi.mock("../api/admin", () => ({
  listPendingUsers: vi.fn(),
  approveUser: vi.fn(),
  rejectUser: vi.fn(),
  listProposedChores: vi.fn(),
  approveChore: vi.fn(),
}));

const anna = {
  id: 2,
  email: "anna@example.com",
  display_name: "Anna",
  role: "member" as const,
  status: "pending" as const,
};

const chore = {
  id: 1,
  title: "Wash dishes",
  description: "Every day after dinner",
  period: "daily" as const,
  weight: 3,
  status: "proposed" as const,
  proposed_by_id: 2,
};

beforeEach(() => {
  vi.mocked(listPendingUsers).mockReset();
  vi.mocked(approveUser).mockReset();
  vi.mocked(rejectUser).mockReset();
  vi.mocked(listProposedChores).mockReset();
  vi.mocked(approveChore).mockReset();
});

describe("AdminPage", () => {
  it("renders both lists", async () => {
    vi.mocked(listPendingUsers).mockResolvedValue([anna]);
    vi.mocked(listProposedChores).mockResolvedValue([chore]);

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText(/Anna/)).toBeInTheDocument();
      expect(screen.getByText("Wash dishes")).toBeInTheDocument();
    });
  });

  it("shows empty states when both lists are empty", async () => {
    vi.mocked(listPendingUsers).mockResolvedValue([]);
    vi.mocked(listProposedChores).mockResolvedValue([]);

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText("No pending members")).toBeInTheDocument();
      expect(screen.getByText("No proposed chores")).toBeInTheDocument();
    });
  });

  it("approving a member calls the endpoint and refetches", async () => {
    const user = userEvent.setup();
    vi.mocked(listPendingUsers)
      .mockResolvedValueOnce([anna])
      .mockResolvedValueOnce([]);
    vi.mocked(listProposedChores).mockResolvedValue([]);
    vi.mocked(approveUser).mockResolvedValue({ ...anna, status: "approved" });

    render(<AdminPage />);

    await waitFor(() => screen.getByText(/Anna/));
    await user.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => {
      expect(approveUser).toHaveBeenCalledWith(2);
      expect(listPendingUsers).toHaveBeenCalledTimes(2);
    });
  });

  it("approving a chore sends the edited weight and period", async () => {
    const user = userEvent.setup();
    vi.mocked(listPendingUsers).mockResolvedValue([]);
    vi.mocked(listProposedChores)
      .mockResolvedValueOnce([chore])
      .mockResolvedValueOnce([]);
    vi.mocked(approveChore).mockResolvedValue({ ...chore, status: "active" });

    render(<AdminPage />);

    await waitFor(() => screen.getByText("Wash dishes"));

    const weightInput = screen.getByLabelText("Weight");
    await user.clear(weightInput);
    await user.type(weightInput, "7");

    const periodSelect = screen.getByLabelText("Period");
    await user.selectOptions(periodSelect, "weekly");

    await user.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => {
      expect(approveChore).toHaveBeenCalledWith(1, 7, "weekly");
    });
  });

  it("shows an error message on a failed request", async () => {
    const user = userEvent.setup();
    vi.mocked(listPendingUsers).mockResolvedValue([anna]);
    vi.mocked(listProposedChores).mockResolvedValue([]);
    vi.mocked(approveUser).mockRejectedValue(new Error("network error"));

    render(<AdminPage />);

    await waitFor(() => screen.getByText(/Anna/));
    await user.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });
});
