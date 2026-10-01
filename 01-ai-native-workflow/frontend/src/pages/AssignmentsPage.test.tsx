import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  completeAssignment,
  getWorkload,
  listMyAssignments,
  postToBoard,
} from "../api/assignments";
import { useAuth } from "../auth/useAuth";
import AssignmentsPage from "./AssignmentsPage";

vi.mock("../api/assignments", () => ({
  listMyAssignments: vi.fn(),
  completeAssignment: vi.fn(),
  postToBoard: vi.fn(),
  getWorkload: vi.fn(),
}));

vi.mock("../auth/useAuth", () => ({
  useAuth: vi.fn(),
}));

const later = {
  id: 1,
  chore_id: 1,
  chore_title: "Mow the lawn",
  chore_weight: 5,
  assignee_id: 1,
  assignee_display_name: "Me",
  due_date: "2026-02-10",
  status: "pending" as const,
  on_board: false,
};

const earlier = {
  id: 2,
  chore_id: 2,
  chore_title: "Wash dishes",
  chore_weight: 3,
  assignee_id: 1,
  assignee_display_name: "Me",
  due_date: "2026-02-01",
  status: "overdue" as const,
  on_board: false,
};

const onBoard = {
  id: 3,
  chore_id: 3,
  chore_title: "Vacuum",
  chore_weight: 2,
  assignee_id: 1,
  assignee_display_name: "Me",
  due_date: "2026-02-15",
  status: "pending" as const,
  on_board: true,
};

const workloadRows = [
  { member_id: 1, display_name: "Me", open_weight: 5, debt: 3, total: 8 },
  { member_id: 2, display_name: "Anna", open_weight: 2, debt: 0, total: 2 },
];

beforeEach(() => {
  vi.mocked(listMyAssignments).mockReset();
  vi.mocked(completeAssignment).mockReset();
  vi.mocked(postToBoard).mockReset();
  vi.mocked(getWorkload).mockReset();
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 1, email: "me@example.com", display_name: "Me", role: "member", status: "approved" },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  });
});

describe("AssignmentsPage", () => {
  it("sorts assignments by due date, earliest first", async () => {
    vi.mocked(listMyAssignments).mockResolvedValue([later, earlier]);
    vi.mocked(getWorkload).mockResolvedValue([]);

    render(<AssignmentsPage />);

    await waitFor(() => {
      const items = screen.getAllByRole("listitem");
      expect(items[0]).toHaveTextContent("Wash dishes");
      expect(items[1]).toHaveTextContent("Mow the lawn");
    });
  });

  it("shows an overdue indicator", async () => {
    vi.mocked(listMyAssignments).mockResolvedValue([earlier]);
    vi.mocked(getWorkload).mockResolvedValue([]);

    render(<AssignmentsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("overdue-badge")).toBeInTheDocument();
    });
  });

  it("calls complete and refetches on Done", async () => {
    const user = userEvent.setup();
    vi.mocked(listMyAssignments)
      .mockResolvedValueOnce([later])
      .mockResolvedValueOnce([]);
    vi.mocked(getWorkload).mockResolvedValue([]);
    vi.mocked(completeAssignment).mockResolvedValue({ ...later, status: "done" });

    render(<AssignmentsPage />);
    await waitFor(() => screen.getByText("Mow the lawn"));

    await user.click(screen.getByRole("button", { name: "Done" }));

    await waitFor(() => {
      expect(completeAssignment).toHaveBeenCalledWith(1);
      expect(listMyAssignments).toHaveBeenCalledTimes(2);
      expect(getWorkload).toHaveBeenCalledTimes(2);
    });
  });

  it("shows On board label instead of the button", async () => {
    vi.mocked(listMyAssignments).mockResolvedValue([onBoard]);
    vi.mocked(getWorkload).mockResolvedValue([]);

    render(<AssignmentsPage />);

    await waitFor(() => {
      expect(screen.getByText("On board")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Post to board" })).not.toBeInTheDocument();
    });
  });

  it("renders the workload table with the current user highlighted", async () => {
    vi.mocked(listMyAssignments).mockResolvedValue([]);
    vi.mocked(getWorkload).mockResolvedValue(workloadRows);

    render(<AssignmentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Anna")).toBeInTheDocument();
      expect(screen.getByTestId("current-user-row")).toHaveTextContent("Me");
    });
  });

  it("shows an empty state when there are no open assignments", async () => {
    vi.mocked(listMyAssignments).mockResolvedValue([]);
    vi.mocked(getWorkload).mockResolvedValue([]);

    render(<AssignmentsPage />);

    await waitFor(() => {
      expect(screen.getByText("You have no open assignments")).toBeInTheDocument();
    });
  });
});
