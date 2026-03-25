# Standards

## Development Process

<!-- Describe the development process: branching strategy, code review, release flow, etc. -->

Feature branches are created from `develop` and merged back via GitLab merge requests. At least one peer approval is required before merging.

**Branching strategy:**

| Branch | Purpose |
|---|---|
| `main` | Production-ready code; the default branch |
| `develop` | Integration branch; CI builds and SonarQube run here |
| `feat/<ticket>-<slug>` | Feature branches, created from `develop` |

**Release flow:** Features are merged into `develop`, then promoted to `main`. Production deployments are triggered manually in GitLab CI.

**Commit message format:** Every commit must start with an issue ID:

```
#123: short description
```

or for cross-project references:

```
[group/]project#123: short description
```

This is enforced by the `commit-msg` git hook defined in `composer.json`.

## Development Stack

<!-- List the technologies used and standards on how to use them. -->

See [Architecture](ARCHITECTURE.md) for the full technology stack.

### Backend

<!-- Backend language, framework, package manager, local dev tooling. -->

- **Language:** PHP 8.3
- **Framework:** Drupal 11
- **Package manager:** Composer
- **Local dev:** DDEV — see [README.md](../README.md) for setup

### Frontend

<!-- Frontend language, framework, styling approach. -->

- **Theme:** Custom Volcano theme (`web/themes/custom/volcano/`)
- **Design system:** Quartz (`@dxp/quartz`) — Web Components, Tailwind CSS, PostCSS
- **Build:** `web/themes/custom/volcano/build.sh` (also runs in CI)
- **Component explorer:** Storybook (`npm run storybook` in the design system directory)

### Testing

<!-- Testing frameworks used for unit, integration, and E2E tests. -->

No automated test suite is currently configured. PHP unit testing infrastructure is available via `drupal/core-dev` (PHPUnit) when needed.

## Feature Documentation

<!-- Each feature has a dedicated spec in docs/features/. Use /document-feature to create or update a spec.
Features are listed in docs/PRODUCT.md with a one-line description and a link to the spec. -->

Each feature has a dedicated spec in `docs/features/`. Use `/document-feature` to create or update a spec. Features are listed in [docs/PRODUCT.md](PRODUCT.md) with a one-line description and a link to the spec.

## Code Style

<!-- Describe the automated formatters and linters in use and how to run them. -->

**PHP:** PHPCS runs automatically on staged PHP files via a pre-commit hook. To run manually inside DDEV:

```bash
ddev exec vendor/bin/phpcs --colors
ddev exec vendor/bin/phpcbf  # auto-fix
```

Or via Composer scripts:

```bash
composer phpcs
composer phpcbf
```

**JavaScript/TypeScript:** ESLint with Prettier integration. Runs via lint-staged on pre-commit inside the design system.

```bash
npm run lint        # check
npm run lint:fix    # auto-fix
```

**CSS:** Stylelint. Runs via lint-staged on pre-commit inside the design system.
