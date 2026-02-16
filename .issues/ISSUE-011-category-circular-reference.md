# ISSUE-011: Category Circular Reference Not Prevented

**Severity:** MEDIUM
**Category:** Architecture / Data Integrity

## Description

In `/Users/u0102180/Code/personal-project/pos-system/backend/src/services/category.service.ts`, the `updateCategory()` method (line 396-453) allows setting `parent_category_id` to any valid category UUID without checking for circular references. The JSDoc comment at line 365-366 explicitly acknowledges this:

```
**Important:** Moving a category to a new parent does NOT validate
against circular references (e.g., making a category its own ancestor).
```

The `buildCategoryTree()` algorithm (line 314) uses a Map-based approach that would enter an infinite loop or produce incorrect results if circular references exist.

## Affected Files

- `/Users/u0102180/Code/personal-project/pos-system/backend/src/services/category.service.ts` -- `updateCategory()` at line 396

## Risk

Data corruption: creating a circular reference would break the category tree display, potentially crashing the frontend or causing infinite loops.

## Recommendation

Add a recursive ancestor check before allowing parent_category_id updates:

```typescript
async function isAncestor(categoryId: string, potentialAncestorId: string): Promise<boolean> {
  // Walk up the tree from categoryId and check if potentialAncestorId is encountered
}
```

## Estimated Effort

2 hours
