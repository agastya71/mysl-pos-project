# ISSUE-018: Frontend Uses Only Inline Styles

**Severity:** LOW
**Category:** Code Quality / Maintainability

## Description

Every component and page in the frontend (e.g., `/Users/u0102180/Code/personal-project/pos-system/pos-client/src/pages/POSPage.tsx`, `/Users/u0102180/Code/personal-project/pos-system/pos-client/src/components/Checkout/CheckoutModal.tsx`) uses inline style objects:

```typescript
const styles = {
  container: { display: 'flex', flexDirection: 'column' as const, ... },
  header: { ... },
};
```

This approach:
- Cannot use CSS pseudo-classes (:hover, :focus, :active) for accessibility
- Cannot use media queries for responsive design
- Creates new style objects on every render (unless memoized)
- Makes style reuse and theming extremely difficult
- Results in large, duplicated style blocks in every component

## Affected Files

- All files in `/Users/u0102180/Code/personal-project/pos-system/pos-client/src/pages/`
- All files in `/Users/u0102180/Code/personal-project/pos-system/pos-client/src/components/`

## Risk

Poor maintainability, no responsive design support, accessibility issues (no :focus styles), performance impact from inline style objects.

## Recommendation

Adopt CSS Modules (already supported by webpack with minimal config) or a CSS-in-JS solution like styled-components. At minimum, extract common styles into shared CSS files.

## Estimated Effort

Ongoing refactoring effort
