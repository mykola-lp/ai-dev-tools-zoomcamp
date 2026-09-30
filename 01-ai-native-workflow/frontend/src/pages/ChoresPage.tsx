import { useEffect, useState, type FormEvent } from "react";

import { listActiveChores, listProposedChores, proposeChore, type ChoreOut } from "../api/chores";
import { getErrorMessage } from "../api/errors";
import { useAuth } from "../auth/useAuth";
import type { components } from "../api/schema";

type ChorePeriod = components["schemas"]["ChorePeriod"];
const PERIODS: ChorePeriod[] = ["daily", "weekly", "monthly"];

export default function ChoresPage() {
  const { user } = useAuth();
  const [activeChores, setActiveChores] = useState<ChoreOut[] | null>(null);
  const [myProposals, setMyProposals] = useState<ChoreOut[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [period, setPeriod] = useState<ChorePeriod>("daily");
  const [weight, setWeight] = useState("3");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function refetch() {
    listActiveChores()
      .then(setActiveChores)
      .catch((err) => setListError(getErrorMessage(err, "Failed to load active chores")));
    listProposedChores()
      .then((chores) => setMyProposals(chores.filter((c) => c.proposed_by_id === user?.id)))
      .catch((err) => setListError(getErrorMessage(err, "Failed to load your proposals")));
  }

  useEffect(refetch, [user?.id]);

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
    <div>
      <h1>Chores</h1>

      <section>
        <h2>Active chores</h2>
        {listError && <p role="alert">{listError}</p>}
        {activeChores === null && <p>Loading…</p>}
        {activeChores !== null && activeChores.length === 0 && <p>No active chores</p>}
        {activeChores !== null && activeChores.length > 0 && (
          <ul>
            {activeChores.map((chore) => (
              <li key={chore.id}>
                <strong>{chore.title}</strong> — {chore.period}, weight {chore.weight}
                {chore.description && <p>{chore.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Propose a chore</h2>
        <form onSubmit={handleSubmit}>
          {formError && <p role="alert">{formError}</p>}
          <label>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            Description
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label>
            Period
            <select value={period} onChange={(e) => setPeriod(e.target.value as ChorePeriod)}>
              {PERIODS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label>
            Weight
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </label>
          <button type="submit" disabled={submitting}>
            Propose
          </button>
        </form>
      </section>

      <section>
        <h2>My proposals</h2>
        {myProposals === null && <p>Loading…</p>}
        {myProposals !== null && myProposals.length === 0 && <p>No proposals yet</p>}
        {myProposals !== null && myProposals.length > 0 && (
          <ul>
            {myProposals.map((chore) => (
              <li key={chore.id}>
                {chore.title} — {chore.status}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
