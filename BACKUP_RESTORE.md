# RefundHold Backup And Restore

This document is for the RefundHold Dokploy demo stack only. Do not use these
commands against Novariel, UltraEco, or any container whose name starts with
`compose-transmit-bluetooth-port-g9ovsd`.

## Safety Rules

- Do not stop, restart, or recreate Docker, Traefik, Dokploy, Novariel, or
  UltraEco.
- Do not inspect or print environment values that may contain secrets.
- Do not run restore commands unless you are intentionally replacing
  RefundHold demo data.
- Do not touch containers, volumes, networks, or databases that are not clearly
  part of RefundHold.

## Identify RefundHold Containers

List likely RefundHold containers:

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}' | grep -i refundhold
```

If the Postgres container name is not obvious, inspect running Postgres
containers and match only the one attached to the RefundHold project:

```bash
docker ps --filter ancestor=postgres:16-alpine --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
```

Check mounts for the candidate Postgres container:

```bash
docker inspect REFUNDHOLD_POSTGRES_CONTAINER --format '{{json .Mounts}}'
```

The expected RefundHold Postgres volume is:

```text
refundhold_postgres_data
```

Stop if the mount, labels, or container name points to Novariel, UltraEco, or
`compose-transmit-bluetooth-port-g9ovsd`.

## Create A Backup

Create a timestamped custom-format dump without printing database secrets:

```bash
docker exec REFUNDHOLD_POSTGRES_CONTAINER sh -lc \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' \
  > "refundhold-$(date +%Y%m%d-%H%M%S).dump"
```

Verify the backup file exists and is non-empty:

```bash
ls -lh refundhold-*.dump
```

Store the dump somewhere private. It contains demo customer/refund records and
should not be committed to Git.

## Restore From Backup

Do not run this against production demo data unless replacement is intended.
Restoring can overwrite current RefundHold rows.

First confirm the target container is the RefundHold Postgres container:

```bash
docker inspect REFUNDHOLD_POSTGRES_CONTAINER --format '{{json .Mounts}}'
```

Then restore a selected dump:

```bash
cat refundhold-YYYYMMDD-HHMMSS.dump | docker exec -i REFUNDHOLD_POSTGRES_CONTAINER sh -lc \
  'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner'
```

Check that Postgres is healthy after restore:

```bash
docker exec REFUNDHOLD_POSTGRES_CONTAINER sh -lc \
  'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

## What Not To Touch

- `dokploy-traefik`
- `dokploy`, `dokploy-postgres`, `dokploy-redis`
- any `compose-transmit-bluetooth-port-g9ovsd-*` container
- any Novariel or UltraEco database, volume, or compose project
- host nginx paths or `/var/www`
