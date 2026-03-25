---
description: Drupal 10/11 compatibility. Use when writing D10/D11 compatible code, migrating from annotations to attributes, converting procedural hooks to OOP, or planning a D10→D11 upgrade.
---

# Drupal 10/11 Compatibility

## Key Differences

| Feature | Drupal 10 | Drupal 11 |
|---------|-----------|-----------|
| PHP Version | 8.1+ | 8.3+ |
| Symfony | 6.x | 7.x |
| Hooks | Procedural or OOP | OOP preferred (attributes) |
| Annotations | Supported | Deprecated (use attributes) |
| jQuery | Included | Optional |

## Writing Compatible Code (D10.3+ and D11)

### PHP Attributes for Plugins

Use PHP attributes — works in D10.2+, required style for D11:

```php
// Modern style (D10.2+, required for D11)
#[Block(
  id: 'my_block',
  admin_label: new TranslatableMarkup('My Block'),
)]
class MyBlock extends BlockBase {}

// Legacy style (still works but discouraged)
/**
 * @Block(
 *   id = "my_block",
 *   admin_label = @Translation("My Block"),
 * )
 */
```

### OOP Hooks (D10.3+)

```php
// src/Hook/MyModuleHooks.php
namespace Drupal\my_module\Hook;

use Drupal\Core\Hook\Attribute\Hook;

final class MyModuleHooks {

  #[Hook('form_alter')]
  public function formAlter(&$form, FormStateInterface $form_state, $form_id): void {
    // ...
  }

  #[Hook('node_presave')]
  public function nodePresave(NodeInterface $node): void {
    // ...
  }

}
```

Register in `services.yml`:
```yaml
services:
  Drupal\my_module\Hook\MyModuleHooks:
    autowire: true
```

Procedural hooks still work but belong in `.module` only for backward compatibility.

### `info.yml` Compatibility

```yaml
# Support both D10 and D11
core_version_requirement: ^10.3 || ^11

# D11 only
core_version_requirement: ^11
```

## Deprecated APIs to Avoid

```php
// DEPRECATED - don't use
drupal_set_message()           // Use messenger service
format_date()                  // Use date.formatter service
entity_load()                  // Use entity_type.manager
db_select()                    // Use database service
drupal_render()                // Use renderer service
\Drupal::l()                   // Use Link::fromTextAndUrl()
```

## Checking for Deprecations

```bash
# Run deprecation checks
./vendor/bin/drupal-check modules/custom/

# Or with PHPStan
./vendor/bin/phpstan analyze modules/custom/ --level=5
```

## Drupal Recipes (D10.3+)

Recipes provide reusable configuration packages:

```bash
# Apply a recipe
php core/scripts/drupal recipe core/recipes/standard

# Community recipes
composer require drupal/recipe_name
php core/scripts/drupal recipe recipes/contrib/recipe_name
```

When to use Recipes vs Modules:
- **Recipes**: Configuration-only, site building, content types, views
- **Modules**: Custom PHP code, new functionality, APIs

## Testing Compatibility in CI

```yaml
jobs:
  test-d10:
    env:
      DRUPAL_CORE: ^10.3
  test-d11:
    env:
      DRUPAL_CORE: ^11
```

## D10 → D11 Migration Checklist

1. Run `drupal-check` for deprecations
2. Update all contrib modules to D11-compatible versions
3. Convert annotations to attributes
4. Move hooks to OOP style
5. Test thoroughly in staging environment

## Sources

- [Drupal 11 Readiness](https://www.drupal.org/docs/upgrading-drupal/how-to-prepare-your-drupal-7-or-8-site-for-drupal-9/deprecation-checking-and-correction-tools)
- [OOP Hooks](https://www.drupal.org/docs/develop/creating-modules/implementing-hooks-in-drupal-11)
- [Drupal Recipes](https://www.drupal.org/docs/extending-drupal/drupal-recipes)
