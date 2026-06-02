# Security Specification & Test Harness

## 1. Data Invariants
- A patient record cannot be created without a valid name.
- Schedulings (appointments) must have a patient ID, schedule date, and valid time.
- All write operations require an authenticated session in Firestore.

## 2. The Dirty Dozen Payloads (Security Edge-Cases)
Here are the 12 malicious payloads engineered to breach security boundaries and why they must be rejected:

1. **Self-Elevated Admin Profile**: Attempting to insert a custom admin status or unauthorized configuration outside our standard roles.
2. **Patient Owner Spoofing**: Attempting to specify a `userId` during Patient creation that does not match the active authenticated session's UID.
3. **Orphaned Schedulings**: Creating an appointment associated with a non-existent patient ID.
4. **Giant ID Injection**: Specifying a giant string (e.g., 200KB of raw text) as an ID to cause Denial of Wallet.
5. **Timestamp Hijacking**: Setting `createdAt` or `updatedAt` to values in the future or the past instead of using `request.time`.
6. **Immutable Field Injection**: Changing the `createdAt` value of an existing document on updates.
7. **Junk Fields Injection (Shadow Updates)**: Attempting to insert unapproved ghost properties (e.g. `{ verifiedBySystem: true }`) into a patient schema.
8. **Invalid Appointment Status Mutation**: Setting status directly to values out of the status enum bounds.
9. **Rogue Settings Override**: Mutating the secure clinic `settings/access_code` or `license` key from an unauthorized or unauthenticated account.
10. **Unauthenticated Read Scraping**: Attempting to grab list data of patients without being signed in to Firebase.
11. **Negative Visits Pricing**: Splicing a negative `cost` or `paid` value in visit records to bypass financial balance metrics.
12. **Character Overflow ID Injection**: Document IDs containing malicious injection characters like semicolons or brackets.

## 3. The Test Suite (`firestore.rules.test.ts`)
Below is our comprehensive configuration test blueprint that validates that such unauthorized structures are strictly blocked.
