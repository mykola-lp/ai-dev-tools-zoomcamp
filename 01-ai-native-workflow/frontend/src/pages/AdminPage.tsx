import { useCallback, useEffect, useState } from "react";

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
import { useRealtime } from "../realtime/useRealtime";
import type { components } from "../api/schema";

type ChorePeriod = components["schemas"]["ChorePeriod"];
const PERIODS: ChorePeriod[] = ["daily", "weekly", "monthly"];

export default function AdminPage() {
  return (
    <div className="page">
      <h1>Admin</h1>

      <PendingMembersSection />
      <ProposedChoresSection />
    </div>
  );
}

function PendingMembersSection() {
  const { subscribe } = useRealtime();

  const [users, setUsers] = useState<UserOut[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

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
    <section className="section">
      <h2>Pending members</h2>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {users === null && <p className="empty-state">Loading…</p>}

      {users !== null && users.length === 0 && <p className="empty-state">No pending members</p>}

      {users !== null && users.length > 0 && (
        <ul className="list">
          {users.map((user) => (
            <li className="list-item" key={user.id}>
              <div className="list-item-main">
                <div className="list-item-title">{user.display_name}</div>

                <div className="list-item-meta">
                  <span>{user.email}</span>
                </div>
              </div>

              <button className="button" onClick={() => handleApprove(user.id)} disabled={busyId === user.id}>
                Approve
              </button>

              <button
                className="button button-quiet"
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
  const { subscribe } = useRealtime();

  const [chores, setChores] = useState<ChoreOut[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, { weight: number; period: ChorePeriod }>>({});

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
    <section className="section">
      <h2>Proposed chores</h2>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {chores === null && <p className="empty-state">Loading…</p>}

      {chores !== null && chores.length === 0 && <p className="empty-state">No proposed chores</p>}

      {chores !== null && chores.length > 0 && (
        <ul className="list">
          {chores.map((chore) => {
            const draft = drafts[chore.id];

            return (
              <li className="list-item" key={chore.id}>
                <div className="list-item-main">
                  <div className="list-item-title">{chore.title}</div>

                  {chore.description && <div className="list-item-meta"><span>{chore.description}</span></div>}

                  <div className="list-item-meta">
                    <span>Proposed by user #{chore.proposed_by_id}</span>
                  </div>

                  <div className="form form-compact">
                    <label className="field">
                      Weight
                      <input
                        type="number"
                        value={draft.weight}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [chore.id]: { ...prev[chore.id], weight: Number(e.target.value) },
                          }))
                        }
                      />
                    </label>

                    <label className="field">
                      Period
                      <select
                        value={draft.period}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [chore.id]: { ...prev[chore.id], period: e.target.value as ChorePeriod },
                          }))
                        }
                      >
                        {PERIODS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <button className="button" onClick={() => handleApprove(chore.id)} disabled={busyId === chore.id}>
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
