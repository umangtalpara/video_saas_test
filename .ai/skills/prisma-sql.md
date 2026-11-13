---
name: "prisma-sql"
description: "Prisma 5 with PostgreSQL/MySQL in NestJS: schema, migrations, PrismaService, repository pattern, transactions, soft delete. Use when the chosen database is SQL (state.stack.dbEngine is postgres or mysql)."
---

# Prisma + SQL Skill

Applies only when Discovery Q4 chose **PostgreSQL / MySQL**. For MongoDB use the `database` skill.

## Setup

- Packages: `@prisma/client` + `prisma` (dev), 5.x. Schema at `codebase/backend/prisma/schema.prisma`.
- `provider = "postgresql"` or `"mysql"`; connection from `DATABASE_URL` only.
- `PrismaService` lives in `src/database/prisma.service.ts` (extends `PrismaClient`, `onModuleInit` → `$connect`, `enableShutdownHooks`). **Only repositories inject it** — services never touch it (`validate-project.js` enforces this).

## Schema conventions

- Models PascalCase singular; map to snake_case plural tables with `@@map("users")` and columns with `@map("created_at")`.
- Primary key `id String @id @default(uuid())`; always `createdAt DateTime @default(now()) @map("created_at")` and `updatedAt DateTime @updatedAt @map("updated_at")`.
- Soft delete: `deletedAt DateTime? @map("deleted_at")`; repositories filter `deletedAt: null` by default.
- Indexes named per naming rules: `@@index([email], map: "idx_users_email")`, `@@unique([email], map: "uq_users_email")`.
- Enums as Prisma `enum` (PascalCase type, UPPER_SNAKE values).

## Migrations

- Development: `npx prisma migrate dev --name <kebab-description>`; commit `prisma/migrations/`.
- Production/CI: `npx prisma migrate deploy` only — never `migrate dev` or `db push`.
- Destructive changes use expand → migrate data → contract across separate deployments.
- After schema edits run `npx prisma generate`.

## Repository pattern

```typescript
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { email, deletedAt: null } });
  }
}
```

- Return domain types (Prisma generated types or mapped DTOs), never raw query builders.
- Select only needed fields (`select`) and paginate with cursor (`take`, `cursor`, `skip: 1`).
- Avoid N+1: use `include`/`select` relations or `findMany` with `in` filters.

## Transactions

- Multi-step writes: `this.prisma.$transaction(async (tx) => { ... })`; pass `tx` into repository methods that accept an optional client.
- Map errors: `P2002` → `ConflictException`, `P2025` → `NotFoundException`, others → `InternalServerErrorException` (log the original).

## Testing

- Unit tests mock the repository, never Prisma.
- Integration tests use a dedicated test database; reset with `prisma migrate reset --force --skip-seed` in `beforeAll`.
