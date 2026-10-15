# Changelog

## 1.0.0 (2026-10-15)

Breaking: the package moves to the estate RU1 stack and to Bazel-only
distribution. The runtime API is the same as 0.3.1: the same exports, with the
same signatures.

### Changed

- Peer `svelte` is now exactly `5.57.2` (was `^5.0.0`), the estate pin.
- The optional `@opentelemetry/api` peer is removed. No module in this package
  imports it.
- Built with TypeScript 7.0.2 (`tsc`) instead of `svelte-package`.
  `foo.svelte.ts` still emits `foo.svelte.js` with its runes left for your
  Svelte compiler, plus `foo.svelte.d.ts` and a declaration map. Type checking
  is `tsc --noEmit` with the svelte rune types; there are no `.svelte`
  components, so `svelte-check` adds nothing here.
- In-house dependencies move to their 1.0.0 Bazel modules:
  tinyland-a11y-engine 1.0.0 (was 0.2.4), tinyland-composables 1.0.0 (was
  0.2.4) and tinyvectors 1.0.0 (was 0.3.2). tinyland-color-utils 1.0.0 is a new
  direct bazel_dep, because tinyland-a11y-engine 1.0.0 no longer carries its
  own link to it.
- `//:pkg` no longer carries npm store links for these modules. The consumer
  links them in its own root package (see Migration).
- Toolchain: typescript 7.0.2, vite 8.3.3 and vitest 5.0.3 (exact); happy-dom
  20; node >= 22.12; aspect_rules_ts 3.10.1 with TypeScript 7.0.2 in Bazel;
  node 22.22.0 in Bazel. The unused `@sveltejs/package`, `svelte-check`,
  `fast-check`, `@fast-check/vitest` and `axe-core` dev dependencies are
  removed.
- Distribution is Bazel only. The package is `private` and is no longer
  published to npmjs or GitHub Packages; the publish workflow is removed.
  Releases are signed git tags plus an entry in xoxd-ai/bazel-registry.
- The stale svelte-package output under `.svelte-kit/` is no longer tracked.

### Migration

1. Replace any npm dependency on `@tummycrypt/tinyland-stores` with the Bazel
   module, plus the four first-party modules it imports at runtime:

   ```starlark
   bazel_dep(name = "tummycrypt_tinyland_stores", version = "1.0.0")
   bazel_dep(name = "tummycrypt_tinyland_a11y_engine", version = "1.0.0")
   bazel_dep(name = "tummycrypt_tinyland_color_utils", version = "1.0.0")
   bazel_dep(name = "tummycrypt_tinyland_composables", version = "1.0.0")
   bazel_dep(name = "tummycrypt_tinyvectors", version = "1.0.0")
   ```

2. Link all five with `npm_link_package` in the package that holds your root
   `node_modules`, passing color-utils as `deps` to the a11y-engine link and
   a11y-engine, composables and tinyvectors as `deps` to the stores link. The
   README has the exact recipe.
3. Use Svelte 5.57.2 in the consuming app.
4. If you relied on the `@opentelemetry/api` optional peer being declared
   here, add it to your own dependencies.
5. Refresh `MODULE.bazel.lock`. Root modules that take this version get
   aspect_rules_ts 3.10.1 through MVS and should pin TypeScript 7.0.2.

## 0.3.1 and earlier

Published to npm as `@tummycrypt/tinyland-stores`. Those versions stay
available but are superseded by the Bazel module.
