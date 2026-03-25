---
description: Drupal Drush generators and CLI-first development. Use when scaffolding modules, creating fields, generating plugins/services/forms, or running Drush commands non-interactively.
---

# Drupal Drush CLI-First Development

**Before writing custom code, use Drush generators to scaffold boilerplate.** Drush generators follow Drupal best practices, reducing errors and accelerating development. Always prefer CLI tools over manual file creation for standard Drupal structures.

> **Using DDEV?** All `drush` commands must be prefixed with `ddev`. See the `/ddev` skill for full details.
> ```bash
> ddev drush cr
> ddev drush generate module
> ```

## Essential Drush Commands

```bash
drush cr                    # Clear cache
drush cex -y                # Export config
drush cim -y                # Import config
drush updb -y               # Run updates
drush en module_name        # Enable module
drush pmu module_name       # Uninstall module
drush ws --severity=error   # Watch logs
drush php:eval "code"       # Run PHP
drush generate              # List all generators
drush gen module            # Generate module (gen is alias)
drush field:create          # Create field (fc is alias)
```

## Content Types and Fields

**CRITICAL: Use CLI commands to create content types and fields instead of manual configuration.**

### Create Content Types

```bash
# Interactive mode
drush generate content-entity

# Via PHP eval (for scripts/automation)
drush php:eval "
\$type = \Drupal\node\Entity\NodeType::create([
  'type' => 'article',
  'name' => 'Article',
  'description' => 'Articles with images and tags',
  'new_revision' => TRUE,
]);
\$type->save();
echo 'Content type created.';
"
```

### Create Fields

```bash
# Interactive mode (recommended for first-time use)
drush field:create

# Non-interactive with all parameters
drush field:create node article \
  --field-name=field_subtitle \
  --field-label="Subtitle" \
  --field-type=string \
  --field-widget=string_textfield \
  --is-required=0 \
  --cardinality=1

# Reference field
drush field:create node article \
  --field-name=field_tags \
  --field-label="Tags" \
  --field-type=entity_reference \
  --field-widget=entity_reference_autocomplete \
  --cardinality=-1 \
  --target-type=taxonomy_term

# Image field
drush field:create node article \
  --field-name=field_image \
  --field-label="Image" \
  --field-type=image \
  --field-widget=image_image \
  --is-required=0 \
  --cardinality=1
```

**Common field types:** `string`, `string_long`, `text_long`, `text_with_summary`, `integer`, `decimal`, `boolean`, `datetime`, `email`, `link`, `image`, `file`, `entity_reference`, `list_string`, `telephone`

**Common field widgets:** `string_textfield`, `string_textarea`, `text_textarea`, `text_textarea_with_summary`, `number`, `checkbox`, `options_select`, `options_buttons`, `datetime_default`, `email_default`, `link_default`, `image_image`, `file_generic`, `entity_reference_autocomplete`

### Manage Fields

```bash
drush field:info node article   # List all fields on a content type
drush field:types               # List available field types
drush field:delete node.article.field_subtitle
```

## Generate Module Scaffolding

```bash
drush generate module           # Complete module
drush generate controller       # Controller with route
drush generate form-simple      # Form with submit/validation
drush generate form-config      # Settings form with config storage
drush generate plugin:block     # Block plugin with DI
drush generate service          # Service class + services.yml entry
drush generate hook             # Hook in .module or OOP hook class (D11)
drush generate event-subscriber # Subscriber class + services.yml entry
drush generate entity:content   # Custom content entity
drush generate entity:configuration  # Config entity
```

## Generate Plugin Types

```bash
drush generate plugin:field:formatter
drush generate plugin:field:widget
drush generate plugin:field:type
drush generate plugin:block
drush generate plugin:condition
drush generate plugin:filter
drush generate drush:command-file
```

## Generate Tests

```bash
drush generate test:unit
drush generate test:kernel
drush generate test:browser
```

## Non-Interactive Mode

**CRITICAL: Drush generators are interactive by default. Use these techniques for automation, CI/CD, and AI-assisted development.**

### Method 1: `--answers` with JSON (Recommended)

```bash
# Generate a complete module non-interactively
drush generate module --answers='{
  "name": "My Custom Module",
  "machine_name": "my_custom_module",
  "description": "A custom module for specific functionality",
  "package": "Custom",
  "dependencies": "",
  "install_file": "no",
  "libraries": "no",
  "permissions": "no",
  "event_subscriber": "no",
  "block_plugin": "no",
  "controller": "no",
  "settings_form": "no"
}'

# Generate a controller
drush generate controller --answers='{
  "module": "my_custom_module",
  "class": "MyController",
  "services": ["entity_type.manager", "current_user"]
}'

# Generate a block plugin
drush generate plugin:block --answers='{
  "module": "my_custom_module",
  "plugin_id": "my_custom_block",
  "admin_label": "My Custom Block",
  "category": "Custom",
  "class": "MyCustomBlock",
  "services": ["entity_type.manager"],
  "configurable": "no",
  "access": "no"
}'

# Generate a service
drush generate service --answers='{
  "module": "my_custom_module",
  "service_name": "my_custom_module.helper",
  "class": "HelperService",
  "services": ["database", "logger.factory"]
}'
```

### Method 2: Sequential `--answer` Flags

```bash
# Answers consumed in order of the prompts
drush generate controller --answer="my_module" --answer="PageController" --answer=""
drush gen controller -a my_module -a PageController -a ""
```

### Method 3: Discover Required Answers

```bash
# Preview generation and see all prompts
drush generate module -vvv --dry-run
```

### Method 4: Auto-Accept Defaults

```bash
drush generate module -y
drush generate module --answer="My Module" -y  # Override specific defaults
```

### Common Answer Keys Reference

| Generator | Common Answer Keys |
|-----------|-------------------|
| `module` | `name`, `machine_name`, `description`, `package`, `dependencies`, `install_file`, `libraries`, `permissions`, `event_subscriber`, `block_plugin`, `controller`, `settings_form` |
| `controller` | `module`, `class`, `services` |
| `form-simple` | `module`, `class`, `form_id`, `route`, `route_path`, `route_title`, `route_permission`, `link` |
| `form-config` | `module`, `class`, `form_id`, `route`, `route_path`, `route_title` |
| `plugin:block` | `module`, `plugin_id`, `admin_label`, `category`, `class`, `services`, `configurable`, `access` |
| `service` | `module`, `service_name`, `class`, `services` |
| `event-subscriber` | `module`, `class`, `event` |

## Workflow Best Practices

1. Always start with generators — scaffold before writing custom code
2. Use `drush field:create` for all field additions — never manually create field config files
3. Export configuration after CLI changes: `drush config:export -y`
4. Use `--dry-run` to preview before writing files

**DON'T manually create:**
- Content type config files (`node.type.*.yml`)
- Field config files (`field.field.*.yml`, `field.storage.*.yml`)
- View mode config (`core.entity_view_display.*.yml`)
- Form mode config (`core.entity_form_display.*.yml`)

## Troubleshooting

```bash
# "Missing required answer" error — use -vvv to see which answer is missing
drush generate module -vvv --answers='{"name": "Test"}'

# JSON parsing errors — use single quotes outside, double inside
drush generate module --answers='{"name": "Test Module"}'  # Correct

# Interactive prompt still appears — provide all required answers
drush generate module -vvv --dry-run 2>&1 | grep -E "^\s*\?"
```

## Sources

- [Drush Code Generators](https://drupalize.me/tutorial/develop-drupal-modules-faster-drush-code-generators)
- [Drush Generate Command](https://www.drush.org/13.x/commands/generate/)
- [Drush field:create](https://www.drush.org/13.x/commands/field_create/)
- [Drupal Code Generator (DCG)](https://github.com/Chi-teck/drupal-code-generator)
