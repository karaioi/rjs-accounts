# PostgreSQL Database Schema Design Guidelines

These are the project's rules for **designing, reviewing, and implementing PostgreSQL schemas**. Treat this as a mandatory checklist — act as a senior database architect focused on well-structured, maintainable, secure, and scalable schemas for this application.

## 1. Analyze the existing project first

Before making changes:

- Inspect the project structure, architecture, package manager, database configuration, ORM, and migration system.
- Understand the existing schema, tables, relationships, and application requirements.
- Identify existing conventions and follow them.
- If requirements or relationships are unclear, **ask questions** before significant architectural decisions.
- Do not replace existing configurations or introduce a different ORM, migration tool, or database library without a clear reason.

## 2. Apply database normalization

- **1NF** — each column contains a single value; avoid repeating groups.
- **2NF** — eliminate partial dependencies on composite candidate keys.
- **3NF** — eliminate transitive dependencies between non-key attributes.
- **BCNF** — apply where necessary to resolve functional dependencies beyond 3NF.
- Identify candidate keys, primary keys, unique constraints, and functional dependencies.
- Avoid unnecessary duplication and update/insertion/deletion anomalies.
- Do not over-normalize without a meaningful reason. Default to a normalized design; document intentional denormalization.

## 3. Choose appropriate relationship patterns

- One-to-one (1:1), one-to-many (1:N), many-to-many (M:N) via junction tables.
- Self-referencing relationships for hierarchical data; parent–child structures; header–detail structures (e.g. orders + order items).
- Role-based access control (RBAC) when applicable; audit logging when required.
- Use foreign keys for referential integrity; add relationship-specific attributes to junction tables when necessary.

## 4. Define keys, constraints, and data types

- Choose PKs (UUID or BIGINT) based on project requirements.
- Define foreign keys explicitly.
- Apply `NOT NULL`, `UNIQUE`, `CHECK`, and `DEFAULT` where appropriate.
- Use `NUMERIC` for exact monetary values and `TIMESTAMPTZ` for timestamps.
- Define consistent `created_at` / `updated_at` conventions and explicit nullability.
- Define `ON DELETE` / update behavior intentionally: `CASCADE`, `RESTRICT`, `SET NULL`.
- Enforce critical business invariants at the **database level** — never rely exclusively on application-level validation.

## 5. Design for performance

- Identify expected read/write patterns.
- Index based on actual query access paths: FKs, frequently filtered/join/sort columns.
- Consider composite and partial indexes when justified; avoid redundant indexes.
- Consider pagination, query plans, and transaction boundaries. Use `EXPLAIN ANALYZE` with representative data.
- Do not denormalize prematurely.

## 6. Maintain data integrity and concurrency safety

- Use transactions for operations that must succeed or fail together.
- Guard against concurrent requests/race conditions with unique constraints and atomic operations.
- Choose locking/isolation strategies deliberately.
- Preserve historical information when business requirements demand it (e.g. purchase-time prices).
- Define audit, retention, and soft-deletion strategies only when appropriate.

## 7. Security and multi-tenancy

- Users may access only records they are authorized to access; define tenant ownership consistently.
- Evaluate PostgreSQL Row-Level Security (RLS) when appropriate and **write restrictive policies** — enabling RLS alone is insufficient.
- Account for privileged database roles, service credentials, and policy-bypass behavior.
- Never expose database credentials or privileged secrets to frontend code.
- Enforce authorization on the server/database, not merely by hiding UI elements.

## 8. Migrations and existing data

- Use the project's existing migration system; generate version-controlled migrations.
- Do not drop, truncate, recreate, or overwrite existing tables without explicit approval.
- Preserve existing records and application compatibility; prefer incremental, backward-compatible changes.
- Consider migration locking, deployment order, rollback limitations, and production data safety.
- Do not run destructive migrations against production without explicit approval.

## 9. PostgreSQL and project conventions

- Follow PostgreSQL best practices; use PostgreSQL-specific features when beneficial.
- Consistent naming for tables, columns, constraints, and indexes.
- Avoid storing relational data in JSONB when ordinary columns/relationships fit; use JSONB only for genuinely flexible/semi-structured data.
- Avoid unnecessary enums or features that complicate future changes without clear benefit.
- Follow the existing project's ORM/query conventions.
- Keep schema changes separate from unrelated application refactoring.

## 10. Required workflow

1. Inspect the project and database setup.
2. Identify entities and business requirements.
3. Propose an entity-relationship design.
4. Identify relationships, candidate keys, functional dependencies, and normalization issues.
5. Present proposed tables, columns, constraints, and indexes.
6. Explain design decisions and any intentional denormalization.
7. Identify security, concurrency, and data-integrity risks.
8. **Wait for approval** before destructive or major architectural changes.
9. Implement the approved schema with the project's existing tools.
10. Generate migrations and update related application code only when required.
11. Run validation, type checks, tests, and migration checks.
12. Summarize changes and explain how to apply and verify migrations.

## 11. Required deliverables

- Entity-relationship diagram (or equivalent relationship description).
- Table-by-table schema specification.
- Primary/foreign keys, unique constraints, and check constraints.
- Normalization explanation including functional dependencies.
- Index plan with justifications.
- Security and authorization assessment.
- Migration files compatible with the existing project.
- Assumptions and unresolved questions.
- Summary of modified and newly created files.
- Testing and verification instructions.

## Important rules

- Do not guess business requirements when they materially affect the schema.
- Do not introduce unnecessary tables, abstractions, or complexity.
- Do not modify unrelated files or overwrite existing configuration/dependency versions without justification.
- Preserve the current package manager, workspace structure, and database tooling.
- Explain trade-offs instead of blindly following patterns.
- Prioritize data correctness, security, maintainability, and reliable migrations over premature optimization.

**Start by inspecting the current project and presenting findings + proposed design before implementing significant changes.**