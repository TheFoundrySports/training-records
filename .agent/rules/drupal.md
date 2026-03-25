---
description: Drupal coding standards for PHP modules and themes — SOLID, docblocks, service layer.
globs: "**/*.php, **/*.module, **/*.install, **/*.theme, **/*.inc, **/*.info.yml"
alwaysApply: false
paths:
  - "**/*.php"
  - "**/*.module"
  - "**/*.install"
  - "**/*.theme"
  - "**/*.inc"
  - "**/*.info.yml"
  - "web/**"
---

# Drupal Rules

Applies when working on Drupal modules or themes.

## Always

- Follow official [Drupal coding standards](https://www.drupal.org/docs/develop/standards) and modern PHP practices
- Apply Drupal PhpCS standards; run the linter before committing
- Document every method with a docblock comment
- Follow SOLID principles — each class must have a single, well-defined responsibility (SRP)
- If already exists or possible to restructure try to follow this folder structure:
  - `src/Controller` for controllers
  - `src/Service` for business logic
  - `src/Entity` for custom entities
- Use descriptive and clear class and method names

## Never

- NEVER place business logic in controllers — they must only coordinate and delegate to services
- NEVER add complex business logic inside entity classes — entities hold data structure and entity-specific behaviours only
- NEVER use `hook_ENTITY_TYPE_insert`, `hook_ENTITY_TYPE_presave`, `hook_ENTITY_TYPE_update`, or `hook_ENTITY_TYPE_delete` when the same logic can be implemented in the entity class
