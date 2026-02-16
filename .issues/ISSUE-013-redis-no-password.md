# ISSUE-013: Redis Password Not Configured in Development

**Severity:** MEDIUM
**Category:** Security / Configuration

## Description

In `/Users/u0102180/Code/personal-project/pos-system/docker-compose.yml` (lines 23-36), Redis runs without any password or authentication. The backend `.env` file at `/Users/u0102180/Code/personal-project/pos-system/backend/.env` has no `REDIS_PASSWORD` variable. While the production compose file supports `REDIS_PASSWORD`, the development configuration is completely open.

The Redis instance stores JWT refresh tokens, which means any process on the same network can read or delete tokens.

## Affected Files

- `/Users/u0102180/Code/personal-project/pos-system/docker-compose.yml` -- Redis service (lines 23-36)
- `/Users/u0102180/Code/personal-project/pos-system/backend/.env` -- no REDIS_PASSWORD

## Risk

Unauthorized access to refresh tokens in shared network environments.

## Recommendation

Add password to development Redis configuration and update the .env file accordingly.

## Estimated Effort

30 minutes
