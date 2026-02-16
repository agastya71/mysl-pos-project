# ISSUE-020: No Logging to Persistent Storage

**Severity:** LOW
**Category:** Operations / Observability

## Description

In `/Users/u0102180/Code/personal-project/pos-system/backend/src/utils/logger.ts`, Winston is configured with only a Console transport. In production, container logs might be lost on restart. There is no file transport, no external logging service integration, and no structured log forwarding.

## Affected Files

- `/Users/u0102180/Code/personal-project/pos-system/backend/src/utils/logger.ts`

## Risk

Loss of audit trail and debugging information after container restarts.

## Recommendation

In production, add a file transport with rotation, or configure a log forwarding solution (CloudWatch, ELK, etc.). The Docker Compose does configure JSON file logging with rotation for containers, which partially mitigates this.

## Estimated Effort

2 hours
