import { useCallback, useEffect, useState, type FormEvent } from "react";

import { listActiveChores, listProposedChores, proposeChore, type ChoreOut } from "../api/chores";
import { getErrorMessage } from "../api/errors";
import { useAuth } from "../auth/useAuth";
import { useRealtime } from "../realtime/useRealtime";
import type { components } from "../api/schema";

type ChorePeriod = components["schemas"]["ChorePeriod"];
const PERIODS: ChorePeriod[] = ["daily", "weekly", "monthly"];

export default function ChoresPage() {
  const { user } = useAuth();
  const { subscribe } = useRealtime();
  const [activeChores, setActiveChores] = useState<ChoreOut[] | null>(null);
  const [myProposals, setMyProposals] = useState<ChoreOut[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [period, setPeriod] = useState<ChorePeriod>("daily");
  const [weight, setWeight] = useState("3");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const refetch = useCallback(() => {
    listActiveChores()
      .then(setActiveChores)
      .catch((err) => setListError(getErrorMessage(err, "Failed to load active chores")));
    listProposedChores()
      .then((chores) => setMyProposals(chores.filter((c) => c.proposed_by_id === user?.id)))
      .catch((err) => setListError(getErrorMessage(err, "Failed to load your proposals")));
  }, [user?.id]);

  useEffect(refetch, [refetch]);

  useEffect(() => {
    return subscribe((event) => {
      if (event.type === "chore.approved") {
        refetch();
      }
    });
  }, [subscribe, refetch]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (title.trim().length === 0) {
      setFormError("Title is required");
      return;
    }

    const weightNumber = Number(weight);

    if (!Number.isInteger(weightNumber) || weightNumber < 1 || weightNumber > 10) {
      setFormError("Weight must be a whole number between 1 and 10");
      return;
    }

    setSubmitting(true);

    try {
      await proposeChore({
        title: title.trim(),
        description: description.trim() || undefined,
        period,
        weight: weightNumber,
      });

      setTitle("");
      setDescription("");
      setPeriod("daily");
      setWeight("3");
      refetch();
    } catch (err) {
      setFormError(getErrorMessage(err, "Failed to propose chore"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h1>Chores</h1>

      {listError && (
        <p className="alert" role="alert">
          {listError}
        </p>
      )}

      <section className="section">
        <h2>Active chores</h2>

        {activeChores === null && <p className="empty-state">Loading…</p>}

        {activeChores !== null && activeChores.length === 0 && (
          <p className="empty-state">No active chores</p>
        )}

        {activeChores !== null && activeChores.length > 0 && (
          <ul className="list">
            {activeChores.map((chore) => (
              <li className="list-item" key={chore.id}>
                <div className="list-item-main">
                  <div className="list-item-title">{chore.title}</div>

                  <div className="list-item-meta">
                    <span>{chore.period}</span>
                    <span>weight {chore.weight}</span>
                    {chore.description && <span>{chore.description}</span>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section">
        <h2>Propose a chore</h2>

        <form className="form" onSubmit={handleSubmit}>
          {formError && (
            <p className="alert" role="alert">
              {formError}
            </p>
          )}

          <label className="field">
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <label className="field">
            Description
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>

          <label className="field">
            Period
            <select value={period} onChange={(e) => setPeriod(e.target.value as ChorePeriod)}>
              {PERIODS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            Weight
            <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </label>

          <button className="button" type="submit" disabled={submitting}>
            Propose
          </button>
        </form>
      </section>

      <section className="section">
        <h2>My proposals</h2>

        {myProposals === null && <p className="empty-state">Loading…</p>}

        {myProposals !== null && myProposals.length === 0 && (
          <p className="empty-state">No proposals yet</p>
        )}

        {myProposals !== null && myProposals.length > 0 && (
          <ul className="list">
            {myProposals.map((chore) => (
              <li className="list-item" key={chore.id}>
                <div className="list-item-main">
                  <div className="list-item-title">{chore.title}</div>
                </div>

                <span className="badge">{chore.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
