# @tummycrypt/tinyland-stores

Svelte 5 rune-based stores for Tinyland applications: authentication, CSRF,
theme and color state, loading phases, auto-refresh and auto-save, client
metrics, TraceQL queries, the a11y circuit breaker and accessibility state.

## Consume (Bazel only)

This package is distributed as a Bazel module from
[xoxd-ai/bazel-registry](https://github.com/xoxd-ai/bazel-registry). It is not
published to npm (RU6).

```starlark
# MODULE.bazel
bazel_dep(name = "tummycrypt_tinyland_stores", version = "1.0.0")
bazel_dep(name = "tummycrypt_tinyland_a11y_engine", version = "1.0.0")
bazel_dep(name = "tummycrypt_tinyland_color_utils", version = "1.0.0")
bazel_dep(name = "tummycrypt_tinyland_composables", version = "1.0.0")
bazel_dep(name = "tummycrypt_tinyvectors", version = "1.0.0")
```

```starlark
# BUILD.bazel (the package that holds your root node_modules)
npm_link_package(
    name = "node_modules/@tummycrypt/tinyland-color-utils",
    src = "@tummycrypt_tinyland_color_utils//:pkg",
)

npm_link_package(
    name = "node_modules/@tummycrypt/tinyland-a11y-engine",
    src = "@tummycrypt_tinyland_a11y_engine//:pkg",
    deps = {
        ":.aspect_rules_js/node_modules/@tummycrypt/tinyland-color-utils": "@tummycrypt/tinyland-color-utils",
    },
)

npm_link_package(
    name = "node_modules/@tummycrypt/tinyland-composables",
    src = "@tummycrypt_tinyland_composables//:pkg",
)

npm_link_package(
    name = "node_modules/@tummycrypt/tinyvectors",
    src = "@tummycrypt_tinyvectors//:pkg",
)

npm_link_package(
    name = "node_modules/@tummycrypt/tinyland-stores",
    src = "@tummycrypt_tinyland_stores//:pkg",
    deps = {
        ":.aspect_rules_js/node_modules/@tummycrypt/tinyland-a11y-engine": "@tummycrypt/tinyland-a11y-engine",
        ":.aspect_rules_js/node_modules/@tummycrypt/tinyland-composables": "@tummycrypt/tinyland-composables",
        ":.aspect_rules_js/node_modules/@tummycrypt/tinyvectors": "@tummycrypt/tinyvectors",
    },
)
```

with `--registry=https://raw.githubusercontent.com/xoxd-ai/bazel-registry/<commit>`
ahead of BCR. `//:pkg` deliberately carries no npm links of its own: a link
carried from another Bazel repo is a relative symlink into `external/<repo>`,
which does not exist in a consumer's runfiles under Bazel 8. Linking the
first-party modules in your own root package and passing them as `deps` keeps
every link inside your repo.

Then import as usual:

```ts
import { themeStore, csrfStore, a11yStore } from '@tummycrypt/tinyland-stores';
```

Peer dependency: `svelte` 5.57.2 (exact). The `.svelte.js` modules keep their
runes, so your app's Svelte compiler (vite-plugin-svelte) must process them.
`axe-core` (4.x) is an optional peer of tinyland-a11y-engine; provide it if you
run live a11y evaluation.

## Develop

```bash
pnpm install --frozen-lockfile   # lock for npm_translate_lock
bazel build //:pkg
bazel test //...                 # vitest suite and the tsc 7.0.2 typecheck
```

The in-house dependencies resolve only through Bazel, so the type check and
tests run under Bazel rather than plain `pnpm`.

## Release

Signed annotated tag `vX.Y.Z`, a GitHub release, and a registry PR whose
`source.json` integrity is computed from the real tag archive. See
[CHANGELOG.md](CHANGELOG.md).

## License

Zlib AND LicenseRef-Tinyland-Proprietary. See [LICENSE](LICENSE).
