create schema if not exists task_manager;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'qonflo_app') then
    create role qonflo_app login noinherit nosuperuser nocreatedb nocreaterole;
  end if;
end;
$$;

create type task_manager.task_status as enum ('to_do', 'pending', 'in_progress', 'done');

create table task_manager.actors (
  id text primary key,
  name text not null
);

insert into task_manager.actors (id, name) values
  ('john.doe', 'John Doe'),
  ('jane.smith', 'Jane Smith'),
  ('alex.chen', 'Alex Chen');

create table task_manager.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  status task_manager.task_status not null default 'to_do',
  created_by text not null references task_manager.actors(id),
  updated_by text not null references task_manager.actors(id),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz
);

create table task_manager.audit_logs (
  id bigint generated always as identity primary key,
  task_id uuid not null references task_manager.tasks(id) on delete restrict,
  task_title text not null,
  actor_id text not null references task_manager.actors(id),
  from_status task_manager.task_status not null,
  to_status task_manager.task_status not null,
  changed_at timestamptz not null,
  check (from_status <> to_status)
);

create index tasks_active_created_at on task_manager.tasks (created_at desc, id)
  where deleted_at is null;
create index audit_logs_task_chronology on task_manager.audit_logs (task_id, changed_at, id);

create function task_manager.guard_task_insert()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  if new.status <> 'to_do' or new.deleted_at is not null then
    raise exception 'A task must start at to_do and cannot start deleted.' using errcode = '23514';
  end if;
  new.created_at := clock_timestamp();
  new.updated_at := new.created_at;
  new.updated_by := new.created_by;
  return new;
end;
$$;

create function task_manager.guard_task_update()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  if old.deleted_at is not null then
    raise exception 'Deleted tasks are immutable.' using errcode = '23514';
  end if;
  if row(new.id, new.title, new.description, new.created_by, new.created_at)
     is distinct from row(old.id, old.title, old.description, old.created_by, old.created_at) then
    raise exception 'Task identity and creation fields are immutable.' using errcode = '23514';
  end if;
  if new.status = old.status and new.deleted_at is not distinct from old.deleted_at then
    -- Cancel a repeated status write before timestamps or audit records can change.
    return null;
  end if;
  if new.status <> old.status then
    if new.deleted_at is distinct from old.deleted_at then
      raise exception 'Deletion and status changes are separate actions.' using errcode = '23514';
    end if;
    if not (
      (old.status = 'to_do' and new.status = 'pending') or
      (old.status = 'pending' and new.status = 'in_progress') or
      (old.status = 'in_progress' and new.status = 'done')
    ) then
      raise exception 'A task must advance exactly one status.' using errcode = '23514';
    end if;
  end if;
  new.updated_at := clock_timestamp();
  if new.deleted_at is not null then
    new.deleted_at := new.updated_at;
  end if;
  return new;
end;
$$;

-- The trigger is the only application write path into the audit table.
-- It runs in the status update's transaction, including rollback on failure.
create function task_manager.append_status_audit()
returns trigger language plpgsql security definer set search_path = pg_catalog as $$
begin
  insert into task_manager.audit_logs
    (task_id, task_title, actor_id, from_status, to_status, changed_at)
  values
    (new.id, new.title, new.updated_by, old.status, new.status, new.updated_at);
  return new;
end;
$$;

create function task_manager.reject_record_removal()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  raise exception 'Task records and audit history must be retained.' using errcode = '23514';
end;
$$;

create trigger validate_task_insert before insert on task_manager.tasks
  for each row execute function task_manager.guard_task_insert();
create trigger validate_task_update before update on task_manager.tasks
  for each row execute function task_manager.guard_task_update();
create trigger record_status_change after update on task_manager.tasks
  for each row when (old.status is distinct from new.status)
  execute function task_manager.append_status_audit();

create trigger keep_audit_records before update or delete on task_manager.audit_logs
  for each row execute function task_manager.reject_record_removal();
create trigger keep_audit_table before truncate on task_manager.audit_logs
  for each statement execute function task_manager.reject_record_removal();
create trigger keep_task_records before delete on task_manager.tasks
  for each row execute function task_manager.reject_record_removal();
create trigger keep_task_table before truncate on task_manager.tasks
  for each statement execute function task_manager.reject_record_removal();

revoke all on schema task_manager from public;
revoke all on all tables in schema task_manager from public;
revoke all on all functions in schema task_manager from public;

grant usage on schema task_manager to qonflo_app;
grant usage on type task_manager.task_status to qonflo_app;
grant select on task_manager.actors, task_manager.tasks, task_manager.audit_logs to qonflo_app;
grant insert (title, description, created_by, updated_by) on task_manager.tasks to qonflo_app;
grant update (status, updated_by, deleted_at) on task_manager.tasks to qonflo_app;
