import { useCallback, useEffect, useState } from "react";

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
import { useRealtime } from "../realtime/useRealtime";

export default function AssignmentsPage() {
  const { user } = useAuth();
  const { subscribe } = useRealtime();
  const [assignments, setAssignments] = useState<AssignmentOut[] | null>(null);
  const [workload, setWorkload] = useState<WorkloadOut[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const refetchAssignments = useCallback(() => {
    listMyAssignments()
      .then((list) => {
        const open = list.filter((a) => a.status === "pending" || a.status === "overdue");
        open.sort((a, b) => a.due_date.localeCompare(b.due_date));
        setAssignments(open);
      })
      .catch((err) => setError(getErrorMessage(err, "Failed to load assignments")));
  }, []);

  const refetchWorkload = useCallback(() => {
    getWorkload()
      .then(setWorkload)
      .catch((err) => setError(getErrorMessage(err, "Failed to load workload")));
  }, []);

  useEffect(() => {
    refetchAssignments();
    refetchWorkload();
  }, [refetchAssignments, refetchWorkload]);

  useEffect(() => {
    return subscribe((event) => {
      if (event.type.startsWith("assignment.") || event.type.startsWith("board.")) {
        refetchAssignments();
        refetchWorkload();
      }
    });
  }, [subscribe, refetchAssignments, refetchWorkload]);

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
    <div className="page">
      <h1>Assignments</h1>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      <section className="section">
        {assignments === null && <p className="empty-state">Loading…</p>}

        {assignments !== null && assignments.length === 0 && (
          <p className="empty-state">You have no open assignments</p>
        )}

        {assignments !== null && assignments.length > 0 && (
          <ul className="list">
            {assignments.map((a) => (
              <li className="list-item" key={a.id}>
                <div className="list-item-main">
                  <div className="list-item-title">
                    {a.chore_title}

                    {a.status === "overdue" && (
                      <>
                        {" "}
                        <span data-testid="overdue-badge" className="badge badge-overdue">
                          Overdue
                        </span>
                      </>
                    )}
                  </div>
              
                  <div className="list-item-meta">
                    <span>Weight {a.chore_weight}</span>
                    <span>Due {a.due_date}</span>
                  </div>
                </div>

                <button className="button" onClick={() => handleDone(a.id)} disabled={busyId === a.id}>
                  Done
                </button>

                {a.on_board ? (
                  <span className="badge">On board</span>
                ) : (
                  <button
                    className="button button-quiet"
                    onClick={() => handlePostToBoard(a.id)}
                    disabled={busyId === a.id}
                  >
                    Post to board
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section">
        <h2>Workload</h2>

        {workload === null && <p className="empty-state">Loading…</p>}

        {workload !== null && (
          <div className="table-wrap">
            <table className="data">
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
                    className={row.member_id === user?.id ? "current-user" : undefined}
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
          </div>
        )}
      </section>
    </div>
  );
}
