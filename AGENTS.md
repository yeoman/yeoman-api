# AI agent instructions

`yeoman-api` is an npm-workspaces monorepo holding the `@yeoman/*` packages shared by the generator and
environment stacks. Everything is ESM (`"type": "module"`). Requires Node `^16.13.0 || >=18.12.0` and
npm `>=11.0.0`.

## Setup

```bash
npm ci
```

This also runs `prepare`, which builds every workspace and installs the husky hooks.

## Before pushing, run `npm test`

```bash
npm test
```

This is the entire CI check — CI runs `npm ci && npm test` on Node 20, 22 and 24, and nothing else.

It is not only tests. The root `pretest` runs `eslint .` and `prettier . --check` **before** any workspace
test, so a lint error or an unformatted file fails the build immediately. Formatting is a build gate here,
not a style preference.

## Fixing lint and formatting

```bash
npm run fix       # prettier --write, then eslint --fix
npm run prettier  # formatting only
```

Staged files are also formatted by lint-staged through the husky `pre-commit` hook. Note that husky is
installed by `prepare`, so **in a clone where `npm ci` has not been run there are no hooks and nothing is
formatted automatically** — in that situation run `npm run fix`, or at minimum
`npx prettier --write <files>`, before committing. Prettier is pinned in `devDependencies`; use that
version rather than whatever is globally installed.

## Workspaces

| Workspace               | Package              | Build | Tests                    |
| ----------------------- | -------------------- | ----- | ------------------------ |
| `workspaces/adapter`    | `@yeoman/adapter`    | `tsc` | `vitest run --coverage`  |
| `workspaces/conflicter` | `@yeoman/conflicter` | `tsc` | `vitest run --coverage`  |
| `workspaces/namespace`  | `@yeoman/namespace`  | `tsc` | `vitest run --coverage`  |
| `workspaces/transform`  | `@yeoman/transform`  | `tsc` | `vitest run --coverage`  |
| `workspaces/types`      | `@yeoman/types`      | `tsc` | none — declarations only |
| `workspaces/eslint`     | `@yeoman/eslint`     | none  | none — config only       |

Workspaces with tests also run `tsc -p tsconfig.test.json` as their own `pretest`, so a type error in a test
file fails before the suite runs.

## Conventions

- Conventional commits, enforced by commitlint through the husky `commit-msg` hook.
- Releases are handled by release-please; do not hand-edit versions or changelogs.

## Accumulated knowledge

Verified notes about how these packages fit together — the dependency topology, and behaviour that is easy
to get wrong — live in `AGENTS-KNOWLEDGE.md`.
