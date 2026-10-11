# FastAPI Development Standards and Best Practices

Use this document as the default engineering guideline when generating, reviewing, or modifying code for this FastAPI project. Apply these standards pragmatically: keep small projects simple, avoid unnecessary abstractions, and prioritize correctness, security, readability, and maintainability.

## 1. Core Principles

- Follow Python conventions and use clear, descriptive names.
- Use type hints for function parameters, return values, and important data structures.
- Keep responsibilities separate: HTTP handling, business logic, persistence, configuration, and security should not be mixed unnecessarily.
- Prefer simple, explicit code over clever or overly abstract designs.
- Keep dependencies current and compatible; do not introduce a library without a clear reason.
- Never invent project requirements, environment variables, database fields, or APIs. Ask when an important detail is ambiguous.

## 2. Recommended Project Structure

Use this structure as a starting point for a medium-sized application. Adapt it to the actual project and avoid creating empty or unnecessary layers.

```text
app/
├── main.py
├── core/
│   ├── config.py
│   ├── security.py
│   └── logging.py
├── api/
│   └── v1/
│       ├── router.py
│       └── endpoints/
├── schemas/
├── models/
├── services/
├── repositories/
├── db/
│   ├── session.py
│   └── base.py
└── tests/
alembic/
pyproject.toml
.env
.env.example
```

Responsibilities:
- `main.py`: create the FastAPI application and register middleware, exception handlers, and routers.
- `api/`: HTTP routes, request handling, dependencies, and status codes.
- `schemas/`: Pydantic request and response models.
- `models/`: database ORM models.
- `services/`: business rules and application workflows.
- `repositories/`: database queries and persistence operations, when this abstraction is useful.
- `core/`: settings, security utilities, and logging configuration.
- `db/`: database engine, session setup, and shared database metadata.
- `tests/`: unit and integration tests.
- `alembic/`: database migrations when using Alembic.

For a small application, a simpler structure is acceptable. Do not add a repository layer or other abstractions unless they provide real value.

## 3. API and Routing Standards

- Group related endpoints with `APIRouter`.
- Use clear, resource-oriented paths, normally plural nouns, such as `/users` and `/orders`.
- Use HTTP methods consistently:
  - `GET`: retrieve data.
  - `POST`: create a resource or trigger a clearly defined operation.
  - `PUT`: replace a resource.
  - `PATCH`: partially update a resource.
  - `DELETE`: delete a resource.
- Use a versioned prefix such as `/api/v1` when the API needs versioning.
- Set explicit `response_model` values for endpoints that return structured data.
- Set appropriate status codes, for example `201 Created` for successful resource creation and `204 No Content` when a successful operation intentionally returns no body.
- Use query parameters for filtering, sorting, and pagination where appropriate.
- Keep endpoint handlers focused on HTTP concerns. Put complex business rules in service functions/classes.
- Design pagination and filtering consistently across similar endpoints.
- Make retryable create/update operations idempotent where the use case requires it; consider idempotency keys for operations where duplicate execution would be harmful.
- Maintain backward compatibility for existing API contracts unless a breaking change is explicitly approved.

## 4. Pydantic and Data Validation

- Use Pydantic models to validate incoming request data and define structured responses.
- Use separate input and output schemas when their fields or security needs differ; for example, `UserCreate`, `UserUpdate`, and `UserResponse`.
- Apply field constraints such as minimum/maximum lengths, numeric bounds, and valid formats.
- Use `EmailStr` for email validation when the relevant optional dependency is installed.
- Do not rely on client-side validation alone.
- Do not expose database-only fields, password hashes, internal flags, or private information in response models.
- Use optional fields carefully and distinguish between “not provided” and an explicit `null` where the update semantics require it.
- Validate business rules in the service layer as well as validating input shape at the API boundary.
- Use Pydantic settings for application configuration where appropriate.

## 5. Dependency Injection

Use FastAPI's `Depends()` for shared dependencies, such as:
- Database sessions.
- The current authenticated user.
- Authorization and permission checks.
- Service objects.
- Request-scoped resources.

Use `yield` dependencies when resources require cleanup. Define transaction ownership clearly: avoid accidentally committing transactions in multiple layers or leaving failed transactions open.

## 6. Business Logic and Database Access

- Keep routes thin and business logic in services.
- Keep database access in a clearly defined place. A repository layer is optional, not mandatory.
- Use an ORM or parameterized queries; never build SQL by concatenating untrusted input.
- Use transactions for operations that must succeed or fail together.
- Use database constraints and indexes to enforce important invariants and support expected query patterns.
- Avoid N+1 query problems and loading more data than needed.
- Use migrations (for example, Alembic) for schema changes in shared and production environments. Do not rely on manual production schema edits.
- Manage database sessions with dependencies or another explicit lifecycle mechanism.
- Do not perform slow external network calls while holding a database transaction open unless necessary.
- Do not use a synchronous database driver directly in an `async def` route if it blocks the event loop. Choose a consistent sync or async database approach.
- Use connection pooling and sensible timeouts for production workloads.
- Handle concurrent updates and race conditions where the business domain requires it.

## 7. Async and Concurrency

- Use `async def` when the request path calls asynchronous I/O libraries.
- Use regular `def` for blocking/synchronous operations that FastAPI can run in its thread pool.
- Do not call blocking I/O or CPU-heavy work directly inside an `async def` handler.
- Use async-compatible HTTP clients and database drivers when using asynchronous flows.
- Offload substantial CPU-bound tasks to an appropriate worker/process system rather than assuming `async` makes them faster.
- Set timeouts and handle cancellation for external service calls.
- Do not create background tasks for critical work that must survive process restarts; use a durable job queue when appropriate.

## 8. Error Handling

- Use `HTTPException` for expected HTTP errors and choose accurate status codes.
- Use centralized exception handlers for application-wide error formats when consistency is needed.
- Return safe, actionable error messages without exposing stack traces, secrets, SQL statements, or internal implementation details.
- Use `400` for malformed or invalid requests when appropriate, `401` for missing/invalid authentication, `403` for insufficient permission, `404` for missing resources, `409` for conflicts, and `422` for request validation errors as appropriate to the API contract.
- Do not catch and silently ignore broad exceptions.
- Log unexpected exceptions with a correlation/request ID where possible, and return a generic `500` response to clients.
- Ensure errors do not reveal whether sensitive accounts or records exist when that would create a security risk.

## 9. Security Requirements

- Authenticate protected endpoints and perform authorization checks for every protected resource/action.
- Enforce object-level authorization: a user must not access or modify another user's resource merely by changing an ID.
- Follow least privilege for users, database accounts, service accounts, and API tokens.
- Store secrets in environment variables or a managed secret store; never commit real secrets.
- Provide `.env.example` with placeholder values only. Ensure `.env` and secret files are excluded from version control.
- Use HTTPS in production.
- Configure CORS for known trusted origins only; do not use permissive wildcard settings with credentials.
- Validate all external input and enforce reasonable body, upload, pagination, and query limits.
- Use parameterized SQL or a safe ORM.
- Apply rate limiting to sensitive or abuse-prone endpoints when appropriate.
- Use secure password hashing via a maintained password-hashing library; never store plaintext passwords.
- Use established authentication standards and maintained libraries rather than designing custom cryptography or token schemes.
- Validate token signature, issuer, audience, expiration, and relevant claims when applicable.
- Do not put secrets or sensitive personal data in URLs.
- Avoid logging passwords, authorization headers, access tokens, session cookies, or unnecessary personal data.
- Keep dependencies patched and scan for known vulnerabilities.
- Set trusted-host/proxy configuration correctly when deployed behind a reverse proxy.
- Review file uploads, redirects, SSRF risks, and external URL fetching if those features exist.
- Apply CSRF protections when using cookie-based authentication in browser contexts where CSRF is relevant.
- Use security headers at the application or reverse-proxy layer as appropriate.
- Follow the OWASP API Security Top 10 as a security review reference.

## 10. Configuration and Environments

- Keep development, test, and production configuration separate.
- Load configuration from environment variables or a settings system.
- Fail fast when required configuration is missing or invalid.
- Never hardcode credentials, production URLs, or environment-specific secrets in source code.
- Use safe production defaults; enable verbose debugging only in development.
- Document required configuration variables and provide placeholder examples.
- Do not print secrets as part of startup diagnostics.

## 11. Logging and Observability

- Use Python's `logging` module or a structured logging solution.
- Include useful context such as request/correlation ID, route, duration, and outcome without exposing sensitive data.
- Prefer structured logs in production systems when supported by the deployment platform.
- Track request latency, error rates, throughput, and dependency/database health.
- Add health endpoints intentionally: distinguish process liveness from dependency readiness when useful.
- Use metrics and tracing for systems where production debugging requires them.
- Avoid logging the same exception repeatedly at multiple layers without adding value.

## 12. Testing Standards

Use `pytest` and FastAPI's `TestClient` or HTTPX, as appropriate.

- Write unit tests for business rules.
- Write integration tests for API routes and database behavior.
- Test successful cases, validation failures, authorization failures, missing resources, and conflict cases.
- Test that response models do not leak private fields.
- Use dependency overrides or fixtures to isolate tests from real external services.
- Use a dedicated test database or isolated test transactions; never run destructive tests against production data.
- Test database migrations and important transaction behavior.
- Make tests deterministic and independent of execution order.
- Add regression tests for bugs.
- Mock external services at appropriate boundaries, but do not mock away the behavior an integration test is intended to verify.
- Include coverage reporting if useful, but do not optimize only for a coverage percentage.

## 13. Code Quality and Type Checking

Recommended tools:
- Ruff for linting and formatting.
- pytest for tests.
- mypy or Pyright for optional/static type checking.
- Alembic for SQLAlchemy database migrations.
- A dependency vulnerability scanner suitable for the project.

Standards:
- Use clear names and small, focused functions.
- Add type annotations to public functions and important interfaces.
- Avoid `Any` unless necessary; narrow types where possible.
- Avoid duplicated logic; extract shared logic only when the abstraction is clear.
- Avoid mutable default arguments.
- Use constants or enums for repeated values with domain meaning.
- Remove unused imports, dead code, and debug prints.
- Keep comments focused on why a non-obvious decision exists, rather than restating what the code does.
- Use a consistent import style and formatting configuration in `pyproject.toml`.
- Do not disable lint/type rules globally just to make checks pass; scope exceptions and explain them.

## 14. API Documentation

- Use FastAPI's generated OpenAPI schema and interactive documentation.
- Add summaries, descriptions, tags, response models, and documented error responses for public endpoints.
- Keep examples accurate and free of real credentials or personal data.
- Document authentication requirements, pagination, filtering, rate limits, and important side effects.
- Treat the OpenAPI contract as part of the API and review unintended changes.
- Keep documentation aligned with actual runtime behavior.

## 15. Performance and Reliability

- Add pagination for potentially large collections.
- Use sensible timeouts for outbound HTTP and database operations.
- Use connection pooling where appropriate.
- Cache only when there is a clear invalidation and consistency strategy.
- Avoid unnecessary database queries and repeated expensive computation.
- Set upload and request-size limits where relevant.
- Use a durable queue for reliable background jobs.
- Use graceful shutdown and resource cleanup.
- Configure production workers and concurrency based on workload and deployment environment; do not assume a single configuration fits every deployment.
- Add retries only when safe, with bounded attempts, backoff, and jitter where appropriate. Do not retry non-idempotent operations blindly.
- Ensure readiness checks reflect the dependencies required to serve traffic.

## 16. Deployment and CI/CD

Before merging or deploying:
1. Install dependencies from the project's declared dependency files.
2. Run formatting and lint checks.
3. Run type checking if configured.
4. Run unit and integration tests.
5. Run dependency/security checks.
6. Validate configuration and migration status.
7. Build and test the deployable artifact/container.
8. Deploy through a repeatable process with health checks and a rollback strategy.

Additional requirements:
- Pin or constrain dependencies using the project's chosen dependency-management approach.
- Use a production ASGI server setup appropriate to the deployment platform.
- Do not use development reload mode in production.
- Run the application with least privilege.
- Keep container images minimal and avoid embedding secrets in image layers.
- Apply database migrations in a controlled deployment step.
- Support graceful shutdown and monitor application health after deployment.

## 17. Suggested HTTP Status Codes

| Scenario | Typical status |
|---|---:|
| Successful read or update returning a body | 200 |
| Resource successfully created | 201 |
| Successful operation with no response body | 204 |
| Invalid request according to API contract | 400 |
| Missing or invalid authentication | 401 |
| Authenticated but not authorized | 403 |
| Resource not found | 404 |
| State or uniqueness conflict | 409 |
| Request validation error | 422 |
| Unexpected server error | 500 |
| Required upstream service unavailable | 503 |

Choose codes consistently with the API contract and framework behavior.

## 18. AI Coding Assistant Instructions

When generating or modifying this project's code:

1. Inspect the existing project structure and conventions before making changes.
2. Follow the existing architecture unless there is a concrete reason to change it.
3. Make the smallest complete change that solves the task.
4. Do not rewrite unrelated files or introduce needless abstractions.
5. Use typed functions, Pydantic schemas, dependency injection, and response models where appropriate.
6. Keep business logic separate from HTTP routing.
7. Validate authorization as well as input shape.
8. Never hardcode or reveal secrets.
9. Add or update tests for changed behavior.
10. Update API documentation and configuration examples when behavior changes.
11. Do not claim that tests, commands, migrations, or deployments succeeded unless they were actually run and their results were checked.
12. If execution is unavailable, state which checks still need to be run.
13. If requirements are ambiguous in a way that affects correctness or security, ask a concise clarifying question rather than guessing.
14. Explain important trade-offs briefly, especially for security, database transactions, concurrency, and breaking API changes.

## 19. Definition of Done

A change is ready when all applicable items are true:

- [ ] The implementation meets the stated requirement.
- [ ] Routes, schemas, services, and persistence responsibilities are appropriately separated.
- [ ] Input validation and authorization are enforced.
- [ ] Responses and status codes are consistent with the API contract.
- [ ] Errors are safe and useful; sensitive details are not exposed.
- [ ] Tests cover the changed behavior and important failure cases.
- [ ] Linting, formatting, and configured type checks pass.
- [ ] Configuration and secrets are handled safely.
- [ ] Documentation and migrations are updated when needed.
- [ ] No unrelated changes, debug code, or secrets are included.
- [ ] Any checks not run are clearly reported.

## 20. Reference Documentation

Use official documentation as the source of truth when details depend on library versions:

- FastAPI: https://fastapi.tiangolo.com/
- Pydantic: https://docs.pydantic.dev/
- Python typing: https://docs.python.org/3/library/typing.html
- pytest: https://docs.pytest.org/
- Ruff: https://docs.astral.sh/ruff/
- Alembic: https://alembic.sqlalchemy.org/
- OWASP API Security Top 10: https://owasp.org/www-project-api-security/

These standards are a baseline, not a reason to overengineer. Prefer the simplest design that satisfies the project's reliability, security, and maintainability needs.
