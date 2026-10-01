import { useEffect, useState } from "react";

import {
  completeAssignment,
  getWorkload,
  listMyAssignments,
  postToBoard,
  type AssignmentOut,
  type WorkloadOut,
} from "../api/assignments";
import { getErrorMessage } from "../api/errors";
import { useAuth } from "../auth/useAuth";

export default function AssignmentsPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentOut[] | null>(null);
  const [workload, setWorkload] = useState<WorkloadOut[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  function refetchAssignments() {
    listMyAssignments()
      .then((list) => {
        const open = list.filter((a) => a.status === "pending" || a.status === "overdue");
        open.sort((a, b) => a.due_date.localeCompare(b.due_date));
        setAssignments(open);
      })
      .catch((err) => setError(getErrorMessage(err, "Failed to load assignments")));
  }

  function refetchWorkload() {
    getWorkload()
      .then(setWorkload)
      .catch((err) => setError(getErrorMessage(err, "Failed to load workload")));
  }

  useEffect(() => {
    refetchAssignments();
    refetchWorkload();
  }, []);

  async function handleDone(id: number) {
    setBusyId(id);
    setError(null);
    try {
      await completeAssignment(id);
      refetchAssignments();
      refetchWorkload();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to complete assignment"));
    } finally {
      setBusyId(null);
    }
  }

  async function handlePostToBoard(id: number) {
    setBusyId(id);
    setError(null);
    try {
      await postToBoard(id);
      refetchAssignments();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to post to board"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1>Assignments</h1>
      {error && <p role="alert">{error}</p>}

      <section>
        {assignments === null && <p>Loading…</p>}
        {assignments !== null && assignments.length === 0 && (
          <p>You have no open assignments</p>
        )}
        {assignments !== null && assignments.length > 0 && (
          <ul>
            {assignments.map((a) => (
              <li key={a.id}>
                <strong>{a.chore_title}</strong> — weight {a.chore_weight}, due {a.due_date}
                {a.status === "overdue" && (
                  <span data-testid="overdue-badge" style={{ color: "red" }}>
                    {" "}
                    OVERDUE
                  </span>
                )}
                {" "}
                <button onClick={() => handleDone(a.id)} disabled={busyId === a.id}>
                  Done
                </button>{" "}
                {a.on_board ? (
                  <span>On board</span>
                ) : (
                  <button onClick={() => handlePostToBoard(a.id)} disabled={busyId === a.id}>
                    Post to board
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Workload</h2>
        {workload === null && <p>Loading…</p>}
        {workload !== null && (
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Open weight</th>
                <th>Debt</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {workload.map((row) => (
                <tr
                  key={row.member_id}
                  style={row.member_id === user?.id ? { fontWeight: "bold" } : undefined}
                  data-testid={row.member_id === user?.id ? "current-user-row" : undefined}
                >
                  <td>{row.display_name}</td>
                  <td>{row.open_weight}</td>
                  <td>{row.debt}</td>
                  <td>{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
