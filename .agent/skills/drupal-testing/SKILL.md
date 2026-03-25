---
description: Drupal testing expertise. Use when writing, running, or choosing between Unit, Kernel, Functional, or FunctionalJS tests in Drupal modules.
---

# Drupal Testing

**Tests are not optional for production code.**

## Test Types

| Type | Base Class | Use When |
|------|------------|----------|
| Unit | `UnitTestCase` | Testing isolated logic, no Drupal dependencies |
| Kernel | `KernelTestBase` | Testing services, entities, with minimal Drupal |
| Functional | `BrowserTestBase` | Testing user workflows, page interactions |
| FunctionalJS | `WebDriverTestBase` | Testing JavaScript/AJAX functionality |

### When to Write Each Type

- **Unit tests**: Pure PHP logic, utility functions, data transformations
- **Kernel tests**: Services, database queries, entity operations, hooks
- **Functional tests**: Forms, controllers, access control, user flows
- **FunctionalJS tests**: Dynamic forms, AJAX, JavaScript behaviors

## Test File Structure

```
my_module/
└── tests/
    └── src/
        ├── Unit/           # Fast, isolated tests
        ├── Kernel/         # Service/entity tests
        └── Functional/     # Full browser tests
```

## Running Tests

```bash
# Run specific test
./vendor/bin/phpunit modules/custom/my_module/tests/src/Unit/MyTest.php

# Run all module tests
./vendor/bin/phpunit modules/custom/my_module

# Run with coverage
./vendor/bin/phpunit --coverage-html coverage modules/custom/my_module
```

## Generating Test Scaffolding

```bash
drush generate test:unit
drush generate test:kernel
drush generate test:browser
```
