import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getMe, login } from "./api/auth";
import { ApiError } from "./api/client";
import App from "./App";

vi.mock("./api/auth", () => ({
  register: vi.fn(),
  login: vi.fn(),
  getMe: vi.fn(),
}));

beforeEach(() => {
  localStorage.clear();
  vi.mocked(login).mockReset();
  vi.mocked(getMe).mockReset();
});

describe("App", () => {
  it("redirects to login when logged out", async () => {
    render(
      <MemoryRouter initialEntries={["/assignments"]}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Log in" })).toBeInTheDocument();
    });
  });

  it("shows the layout after a successful login", async () => {
    const user = userEvent.setup();
    vi.mocked(login).mockResolvedValue({
      access_token: "token123",
      token_type: "bearer",
    });
    vi.mocked(getMe).mockResolvedValue({
      id: 1,
      email: "admin@example.com",
      display_name: "Admin",
      role: "admin",
      status: "approved",
    });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/email/i), "admin@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText("Assignments")).toBeInTheDocument();
    });
  });

  it("shows the backend error message for a pending login", async () => {
    const user = userEvent.setup();
    vi.mocked(login).mockRejectedValue(
      new ApiError(403, { detail: "Your account is waiting for admin approval" }),
    );

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/email/i), "anna@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Your account is waiting for admin approval",
      );
    });
  });

  it("shows the Admin link for an admin", async () => {
    const user = userEvent.setup();
    vi.mocked(login).mockResolvedValue({
      access_token: "token123",
      token_type: "bearer",
    });
    vi.mocked(getMe).mockResolvedValue({
      id: 1,
      email: "admin@example.com",
      display_name: "Admin",
      role: "admin",
      status: "approved",
    });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/email/i), "admin@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });
  });

  it("hides the Admin link for a member", async () => {
    const user = userEvent.setup();
    vi.mocked(login).mockResolvedValue({
      access_token: "token456",
      token_type: "bearer",
    });
    vi.mocked(getMe).mockResolvedValue({
      id: 2,
      email: "anna@example.com",
      display_name: "Anna",
      role: "member",
      status: "approved",
    });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/email/i), "anna@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText("Assignments")).toBeInTheDocument();
    });
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });
});
