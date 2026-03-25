---
description: Drupal contrib-first philosophy. Use when evaluating whether to build custom code vs. using existing contrib modules, or when researching drupal.org for existing solutions.
---

# Drupal Contrib-First Philosophy

**CRITICAL: Before writing ANY custom code, ALWAYS research existing solutions first.**

When a developer asks you to implement functionality:

1. **Ask the developer**: "Have you checked drupal.org for existing contrib modules that solve this?"
2. **Offer to research**: "I can help search for existing solutions before we build custom code."
3. **Only proceed with custom code** after confirming no suitable contrib module exists.

## How to Research Contrib Modules

Search on [drupal.org/project/project_module](https://www.drupal.org/project/project_module):

**Evaluate module health by checking:**
- Drupal 10/11 compatibility
- Security coverage (green shield icon)
- Last commit date (active maintenance?)
- Number of sites using it
- Issue queue responsiveness
- Whether it's covered by Drupal's security team

**Ask these questions:**
- Is there a well-maintained contrib module for this?
- Can an existing module be extended rather than building from scratch?
- Is there a Drupal Recipe (10.3+) that bundles this functionality?
- Would a patch to an existing module be better than custom code?

## Before You Code Checklist

1. [ ] Searched drupal.org for existing modules?
2. [ ] Checked if a Recipe exists (Drupal 10.3+)?
3. [ ] Reviewed similar contrib modules for patterns?
4. [ ] Confirmed no suitable solution exists?
5. [ ] Planned test coverage?
6. [ ] Defined config schema for any custom config?
7. [ ] Using dependency injection (no static calls)?
