import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listBoard, takeFromBoard } from "../api/board";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/useAuth";
import BoardPage from "./BoardPage";

vi.mock("../api/board", () => ({
  listBoard: vi.fn(),
  takeFromBoard: vi.fn(),
}));

vi.mock("../auth/useAuth", () => ({
  useAuth: vi.fn(),
}));

const ownPosting = {
  id: 1,
  chore_id: 1,
  chore_title: "Mow the lawn",
  chore_weight: 5,
  assignee_id: 1,
  assignee_display_name: "Me",
  due_date: "2026-02-10",
  status: "pending" as const,
  on_board: true,
};

const othersPosting = {
  id: 2,
  chore_id: 2,
  chore_title: "Wash dishes",
  chore_weight: 3,
  assignee_id: 2,
  assignee_display_name: "Anna",
  due_date: "2026-02-05",
  status: "overdue" as const,
  on_board: true,
};

beforeEach(() => {
  vi.mocked(listBoard).mockReset();
  vi.mocked(takeFromBoard).mockReset();
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 1, email: "me@example.com", display_name: "Me", role: "member", status: "approved" },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  });
});

describe("BoardPage", () => {
  it("renders the board list", async () => {
    vi.mocked(listBoard).mockResolvedValue([othersPosting]);

    render(<BoardPage />);

    await waitFor(() => {
      expect(screen.getByText("Wash dishes")).toBeInTheDocument();
      expect(screen.getByText(/posted by Anna/)).toBeInTheDocument();
    });
  });

  it("hides Take on the user's own posting", async () => {
    vi.mocked(listBoard).mockResolvedValue([ownPosting, othersPosting]);

    render(<BoardPage />);

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "Take" })).toHaveLength(1);
    });
  });

  it("calls take and refetches on success", async () => {
    const user = userEvent.setup();
    vi.mocked(listBoard)
      .mockResolvedValueOnce([othersPosting])
      .mockResolvedValueOnce([]);
    vi.mocked(takeFromBoard).mockResolvedValue({ ...othersPosting, assignee_id: 1, on_board: false });

    render(<BoardPage />);
    await waitFor(() => screen.getByText("Wash dishes"));

    await user.click(screen.getByRole("button", { name: "Take" }));

    await waitFor(() => {
      expect(takeFromBoard).toHaveBeenCalledWith(2);
      expect(listBoard).toHaveBeenCalledTimes(2);
    });
  });

  it("shows an error and refetches when the item is already gone", async () => {
    const user = userEvent.setup();
    vi.mocked(listBoard)
      .mockResolvedValueOnce([othersPosting])
      .mockResolvedValueOnce([]);
    vi.mocked(takeFromBoard).mockRejectedValue(
      new ApiError(409, { detail: "Assignment is not on the board" }),
    );

    render(<BoardPage />);
    await waitFor(() => screen.getByText("Wash dishes"));

    await user.click(screen.getByRole("button", { name: "Take" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Assignment is not on the board");
      expect(listBoard).toHaveBeenCalledTimes(2);
    });
  });

  it("shows an empty state", async () => {
    vi.mocked(listBoard).mockResolvedValue([]);

    render(<BoardPage />);

    await waitFor(() => {
      expect(screen.getByText("Nothing on the board")).toBeInTheDocument();
    });
  });
});
