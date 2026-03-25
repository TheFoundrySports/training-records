---
description: Drupal cache metadata patterns. Use when adding cache tags, contexts, or max-age to render arrays, or when troubleshooting caching issues in Drupal.
---

# Drupal Cache Metadata

**Always add cache metadata to render arrays** to avoid stale content and cache poisoning.

## Cache Metadata in Render Arrays

```php
$build['content'] = [
  '#markup' => $content,
  '#cache' => [
    'tags' => ['node_list', 'user:' . $uid],
    'contexts' => ['user.permissions', 'url.query_args'],
    'max-age' => 3600,
  ],
];
```

## Cache Tags

Invalidate cached content when related data changes:

| Tag | Invalidated when |
|-----|-----------------|
| `node:123` | Specific node is saved/deleted |
| `node_list` | Any node is created/deleted |
| `user:456` | Specific user is saved/deleted |
| `config:my_module.settings` | Module config is changed |
| `taxonomy_term:789` | Specific term is saved/deleted |
| `taxonomy_term_list` | Any term is created/deleted |

## Cache Contexts

Vary cached output based on request context:

| Context | Varies by |
|---------|-----------|
| `user` | Current user identity |
| `user.permissions` | User's permission set |
| `user.roles` | User's roles |
| `url` | Full URL including query string |
| `url.path` | URL path only |
| `url.query_args` | Query string parameters |
| `languages` | Interface language |
| `session` | Session data |

## Max-Age

- `0` — Not cacheable (e.g., real-time data)
- `3600` — Cache for 1 hour
- `Cache::PERMANENT` — Cache indefinitely (invalidated by tags only)

## Bubbling Cache Metadata

Cache metadata from child elements automatically bubbles up to parent render arrays. When building elements from entities or services, use `CacheableMetadata` to collect and apply metadata:

```php
use Drupal\Core\Cache\CacheableMetadata;

$cache = new CacheableMetadata();
$cache->addCacheTags(['node_list']);
$cache->addCacheContexts(['user.permissions']);
$cache->applyTo($build);
```

## Sources

- [Cache API](https://www.drupal.org/docs/drupal-apis/cache-api)
- [Cache tags](https://www.drupal.org/docs/drupal-apis/cache-api/cache-tags)
- [Cache contexts](https://www.drupal.org/docs/drupal-apis/cache-api/cache-contexts)
