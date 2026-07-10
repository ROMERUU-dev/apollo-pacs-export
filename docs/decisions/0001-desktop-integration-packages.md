# ADR 0001: immutable generated desktop packages

- Status: accepted for M2
- Date: 2026-07-09

## Context

Apollo Reception needs the portable bridge contracts and integration services
from `apollo-reception-macos`. The workspaces are private packages and are not
published to a registry. A production `../../` dependency, `npm link`, copied
source, or a mutable Git branch would make CI and deployments non-reproducible.

## Decision

Commit npm tarballs generated from reviewed native commit `0f4a4d9` under
`vendor/apollo-desktop/0f4a4d9`. Declare them as `file:` dependencies and let
`package-lock.json` record their integrity hashes.

The frontend imports only package exports. React components use the central
`src/platform/desktop` boundary and never call WebKit globals directly.

## Consequences

- Builds require no private registry or GitHub credentials.
- Every frontend commit identifies the exact native package bytes it consumed.
- Updating the bridge requires a new reviewed native commit, rebuilt tarballs,
  a new vendor directory, and an npm lockfile update.
- Tarballs add a small amount of generated binary content to the frontend repo.
