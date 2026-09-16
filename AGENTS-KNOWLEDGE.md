# Implementation knowledge base for AI agents

Notes for AI agents working on this repository. This file is staged on the `agents-knowledge` branch and is
intended to land on `main`.

Everything below was verified against the source in this repository. Treat it as a snapshot: check the
current source before relying on a detail, and update this file when something here turns out to be stale.

## Repository shape

`yeoman-api` is an npm-workspaces monorepo holding the `@yeoman/*` packages that the generator and
environment stacks share. Releases are handled by release-please; tests run under vitest.

| Workspace               | Package              | Runtime dependencies                                                                    |
| ----------------------- | -------------------- | --------------------------------------------------------------------------------------- |
| `workspaces/types`      | `@yeoman/types`      | none                                                                                    |
| `workspaces/adapter`    | `@yeoman/adapter`    | `@inquirer/prompts`, `inquirer`, `chalk`, `ora`, `p-queue`, `log-symbols`, `text-table` |
| `workspaces/conflicter` | `@yeoman/conflicter` | `@yeoman/transform`, `mem-fs-editor`, `minimatch`, `diff`, `isbinaryfile`, …            |
| `workspaces/transform`  | `@yeoman/transform`  | `minimatch`                                                                             |
| `workspaces/namespace`  | `@yeoman/namespace`  | none                                                                                    |
| `workspaces/eslint`     | `@yeoman/eslint`     | none                                                                                    |

Note that `@yeoman/adapter` has **no filesystem dependencies at all** — its dependencies are entirely
prompt/terminal I/O. Anything that would make the adapter depend on `mem-fs` or on filesystem access is a
change in that package's posture and reviewers will treat it as such.

## `@yeoman/types` does not own the adapter types

This is the most counterintuitive fact in the repository, and it is easy to get backwards.

The adapter interfaces are defined in **`@yeoman/adapter`**, and `@yeoman/types` re-exports them:

- `workspaces/types/types/index.d.ts` — `export * from '@yeoman/adapter/types';`
- `workspaces/types/types/environment/environment.d.ts` — `import type { InputOutputAdapter } from '@yeoman/adapter/types';`

So when a consumer writes `import type { QueuedAdapter } from '@yeoman/types'`, it receives a symbol that
originates in `@yeoman/adapter`. The practical consequence: a new type that hangs off the adapter interface
belongs in `@yeoman/adapter/types`, **not** in `@yeoman/types` — and adding it there requires no change to
`@yeoman/types` at all, because the wildcard re-export carries it to every consumer automatically.

That matters because `@yeoman/types` is the highest-coupling package in the stack (everything peer-depends
on it, and it has zero runtime dependencies), so it is the most expensive place to make a breaking change.

`@yeoman/adapter` exposes those declarations through a **types-only** export condition, which is why
`@yeoman/types` can re-export them without pulling in any runtime code:

```jsonc
// workspaces/adapter/package.json
"exports": {
  "./types": { "types": "./types/index.d.ts" }   // no "import" condition
}
```

## Optional peer dependencies, and the floor they do not enforce

`@yeoman/types` declares its companions as **optional** peers with deliberately wide ranges, so that a major
release of the adapter or of mem-fs does not break it:

```jsonc
// workspaces/types/package.json
"peerDependencies": {
  "@yeoman/adapter": "^1.6.0 || ^2.0.0-beta.0 || ^3.0.0 || ^4.0.0 || ^5.0.0",
  "mem-fs": "^3.0.0 || ^4.0.0-beta.1 || ^6.0.0"
},
"peerDependenciesMeta": {
  "@yeoman/adapter": { "optional": true },
  "mem-fs": { "optional": true }
}
```

Two consequences worth remembering:

- Anything defined in `@yeoman/adapter/types` is only visible through `@yeoman/types` when an adapter is
  actually installed. That is fine for things that are meaningless without an adapter, and wrong for
  anything `@yeoman/types` must be able to stand up on its own.
- Because the range accepts everything from `^1.6.0` upward, a consumer can resolve an adapter old enough to
  lack a newly added type while still importing it through `@yeoman/types`. When a type is added to
  `@yeoman/adapter/types`, the consuming packages (`yeoman-environment`, `yeoman-generator`) must raise their
  own `@yeoman/adapter` floor — the peer range here will not do it for them. This only surfaces at
  integration time, so state it explicitly in the PR.

## Consumer topology (outside this repository)

Observed at `yeoman-environment@7.0.0` and `yeoman-generator@9.1.0`:

- `yeoman-environment` — runtime dependency on `@yeoman/adapter`, `@yeoman/conflicter`, `@yeoman/namespace`,
  `@yeoman/transform`, `@yeoman/types`, plus `mem-fs` and `mem-fs-editor`. Peer-depends on `@yeoman/adapter`,
  `@yeoman/types`, `mem-fs`.
- `yeoman-generator` — peer-depends on `@yeoman/types` and `mem-fs`, and depends on `mem-fs-editor`. It has
  **no runtime dependency on `@yeoman/adapter`** (only a dev dependency).

That asymmetry is the reason to prefer `@yeoman/adapter/types` over a new shared package: defining a type in
`@yeoman/adapter` costs `yeoman-generator` nothing, because it already reaches those symbols through
`@yeoman/types`.

## Conflicter: how `--force` and dry-run actually behave

In `workspaces/conflicter/src/conflicter.ts`:

- A file whose destination **does not exist** is never prompted about — it is a plain create. The prompt only
  happens for a collision. So "no prompt appeared" does not mean the conflicter was bypassed.
- `force` short-circuits the prompt and writes.
- `dryRun` does not stop the commit transform directly. It marks the file as skipped, and
  `fileShouldBeSkipped` leads to `clearFileState`. Clearing the state is what prevents the write, because the
  downstream commit transform only writes files that are still in a modified state. Debugging a "dry run
  still wrote a file" report starts here, not in the commit transform.
