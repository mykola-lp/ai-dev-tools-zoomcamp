import { useCallback, useEffect, useState } from "react";

import { useRealtime } from "../realtime/useRealtime";

import {
  approveChore,
  approveUser,
  listPendingUsers,
  listProposedChores,
  rejectUser,
  type ChoreOut,
  type UserOut,
} from "../api/admin";
import { getErrorMessage } from "../api/errors";
import type { components } from "../api/schema";

type ChorePeriod = components["schemas"]["ChorePeriod"];
const PERIODS: ChorePeriod[] = ["daily", "weekly", "monthly"];

export default function AdminPage() {
  return (
    <div>
      <h1>Admin</h1>
      <PendingMembersSection />
      <ProposedChoresSection />
    </div>
  );
}

function PendingMembersSection() {
  const [users, setUsers] = useState<UserOut[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const { subscribe } = useRealtime();

  const refetch = useCallback(() => {
    listPendingUsers()
      .then(setUsers)
      .catch((err) => setError(getErrorMessage(err, "Failed to load pending members")));
  }, []);

  useEffect(refetch, [refetch]);

  useEffect(() => {
    return subscribe((event) => {
      if (event.type === "member.approved") {
        refetch();
      }
    });
  }, [subscribe, refetch]);

  async function handleApprove(userId: number) {
    setBusyId(userId);
    setError(null);
    try {
      await approveUser(userId);
      refetch();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to approve member"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(userId: number) {
    setBusyId(userId);
    setError(null);
    try {
      await rejectUser(userId);
      refetch();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to reject member"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section>
      <h2>Pending members</h2>
      {error && <p role="alert">{error}</p>}
      {users === null && <p>Loading…</p>}
      {users !== null && users.length === 0 && <p>No pending members</p>}
      {users !== null && users.length > 0 && (
        <ul>
          {users.map((user) => (
            <li key={user.id}>
              {user.display_name} ({user.email}){" "}
              <button
                onClick={() => handleApprove(user.id)}
                disabled={busyId === user.id}
              >
                Approve
              </button>{" "}
              <button
                onClick={() => handleReject(user.id)}
                disabled={busyId === user.id}
              >
                Reject
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ProposedChoresSection() {
  const [chores, setChores] = useState<ChoreOut[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, { weight: number; period: ChorePeriod }>>({});

  const { subscribe } = useRealtime();

  const refetch = useCallback(() => {
    listProposedChores()
      .then((list) => {
        setChores(list);
        setDrafts(
          Object.fromEntries(
            list.map((chore) => [chore.id, { weight: chore.weight, period: chore.period }]),
          ),
        );
      })
      .catch((err) => setError(getErrorMessage(err, "Failed to load proposed chores")));
  }, []);

  useEffect(refetch, [refetch]);

  useEffect(() => {
    return subscribe((event) => {
      if (event.type === "chore.approved") {
        refetch();
      }
    });
  }, [subscribe, refetch]);

  async function handleApprove(choreId: number) {
    const draft = drafts[choreId];
    setBusyId(choreId);
    setError(null);
    try {
      await approveChore(choreId, draft.weight, draft.period);
      refetch();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to approve chore"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section>
      <h2>Proposed chores</h2>
      {error && <p role="alert">{error}</p>}
      {chores === null && <p>Loading…</p>}
      {chores !== null && chores.length === 0 && <p>No proposed chores</p>}
      {chores !== null && chores.length > 0 && (
        <ul>
          {chores.map((chore) => {
            const draft = drafts[chore.id];
            return (
              <li key={chore.id}>
                <strong>{chore.title}</strong>
                {chore.description && <p>{chore.description}</p>}
                <p>Proposed by user #{chore.proposed_by_id}</p>
                <label>
                  Weight
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={draft.weight}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [chore.id]: { ...prev[chore.id], weight: Number(e.target.value) },
                      }))
                    }
                  />
                </label>
                <label>
                  Period
                  <select
                    value={draft.period}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [chore.id]: {
                          ...prev[chore.id],
                          period: e.target.value as ChorePeriod,
                        },
                      }))
                    }
                  >
                    {PERIODS.map((period) => (
                      <option key={period} value={period}>
                        {period}
                      </option>
                    ))}
                  </select>
                </label>
                <button onClick={() => handleApprove(chore.id)} disabled={busyId === chore.id}>
                  Approve
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
