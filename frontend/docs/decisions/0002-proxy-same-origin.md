# ADR-0002 — Same-origin API via dev proxy (frontend)

**Status:** Accepted
**Phase:** A

## Context
The backend (`:3000/api/v1`) sets no CORS headers. Options: enable CORS on the
backend, or route the UI through a proxy so all calls are same-origin.

## Decision
Use an Angular dev-server proxy (`proxy.conf.json`: `/api` →
`http://localhost:3000/api/v1`) for development, and same-origin relative URLs
by default in the app. Provide an `API_URL` environment override for standalone
deployments. Do **not** change the backend to enable CORS in Phase 0.

## Consequences
- Good: no backend change; no CORS surface; prod-shaped (reverse proxy in front
  of both); `API_URL` keeps flexibility.
- Trade-off: dev needs both servers running; the proxy path is fixed through
  `angular.json` serve options.

## References
- `frontend/docs/HLD.md` §2 D3; `frontend/docs/LLD.md` §7.