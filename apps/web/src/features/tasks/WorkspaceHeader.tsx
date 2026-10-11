import type { Actor, ActorId } from '@taskline/shared';

interface WorkspaceHeaderProps {
  actors: Actor[];
  actorId: ActorId;
  disabled: boolean;
  onActorChange: (actor: ActorId) => void;
}

export function WorkspaceHeader({
  actors,
  actorId,
  disabled,
  onActorChange,
}: WorkspaceHeaderProps) {
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>Taskline</span>
        <span className="brand-note">Every change, accounted for.</span>
      </div>
      <div className="actor-control">
        <label htmlFor="actor">Acting as</label>
        <select
          id="actor"
          value={actorId}
          disabled={disabled}
          onChange={(event) => {
            const actor = actors.find((person) => person.id === event.target.value);
            if (actor) onActorChange(actor.id);
          }}
        >
          {actors.length ? (
            actors.map((actor) => (
              <option key={actor.id} value={actor.id}>
                {actor.name}
              </option>
            ))
          ) : (
            <option value="john.doe">Loading actors…</option>
          )}
        </select>
      </div>
    </header>
  );
}
