# Security Specification: SGX Live Engine Firebase ABAC Rules

## 1. Data Invariants
1. **Admin Gated Access**: Only authenticated users with email `info@spatialgineers.com` or verified documents in `/admins/{uid}` with `email_verified == true` can write to questions, tenant configurations, admin rosters, and director session states.
2. **Read Access**: Live questions and session states are readable by connected audience members and OBS stages.
3. **Admin Immunity**: Non-admin users cannot create, elevate, or spoof admin roles or overwrite system states.
4. **Data Integrity**: Questions and tenant configurations must adhere strictly to length limits, required fields, and type bounds.

## 2. The "Dirty Dozen" Vulnerability Payloads (All Must Be Rejected)
1. **Unauthenticated Admin Write**: Anonymous client attempting to write to `/admins/{uid}`.
2. **Email Spoofing Attack**: Authenticated user with spoofed `email` claim but `email_verified == false`.
3. **Non-Admin Question Creation**: Attendee user attempting to insert malicious CYOA scenario into `/questions/{id}`.
4. **Ghost Field Poisoning**: Inserting unexpected schema properties into `/tenants/{id}`.
5. **Admin Self-Elevation**: Regular attendee attempting to write their own UID into `/admins/{uid}`.
6. **Oversized String Injection (Denial of Wallet)**: Submitting a 2MB question prompt payload to exhaust Firestore storage.
7. **Session Status Shortcut**: Non-admin altering session status from `IDLE` to `RESULT_REVEALED`.
8. **Invalid Enum Injection**: Attempting to set `answerType` to an unapproved string like `HACKED_TYPE`.
9. **Null Document ID Write**: Writing with an illegal document ID containing special characters.
10. **Tenant Color Injection**: Providing an invalid non-hex CSS string for `primaryColor`.
11. **Tenant ID Tampering**: Attempting to change the immutable `tenantId` of a question on update.
12. **Blanket Query Scraping**: Attempting an unrestricted list read on restricted collections without proper indexing.
