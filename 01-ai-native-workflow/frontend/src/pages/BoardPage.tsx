import { useCallback, useEffect, useState } from "react";

import { listBoard, takeFromBoard, type AssignmentOut } from "../api/board";
import { getErrorMessage } from "../api/errors";
import { useAuth } from "../auth/useAuth";
import { useRealtime } from "../realtime/useRealtime";

export default function BoardPage() {
  const { user } = useAuth();
  const { subscribe } = useRealtime();
  const [items, setItems] = useState<AssignmentOut[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const refetch = useCallback(() => {
    listBoard()
      .then(setItems)
      .catch((err) => setError(getErrorMessage(err, "Failed to load the board")));
  }, []);

  useEffect(refetch, [refetch]);

  useEffect(() => {
    return subscribe((event) => {
      if (event.type.startsWith("board.")) {
        refetch();
      }
    });
  }, [subscribe, refetch]);

  async function handleTake(id: number) {
    setBusyId(id);
    setError(null);
    try {
      await takeFromBoard(id);
      refetch();
    } catch (err) {
      setError(getErrorMessage(err, "This assignment is no longer on the board"));
      refetch();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1>Board</h1>
      {error && <p role="alert">{error}</p>}
      {items === null && <p>Loading…</p>}
      {items !== null && items.length === 0 && <p>Nothing on the board</p>}
      {items !== null && items.length > 0 && (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <strong>{item.chore_title}</strong> — weight {item.chore_weight}, due{" "}
              {item.due_date}, posted by {item.assignee_display_name}
              {" "}
              {item.assignee_id !== user?.id && (
                <button onClick={() => handleTake(item.id)} disabled={busyId === item.id}>
                  Take
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
