# Supabase migrations

`20260910_05b_security_hardening.sql` is the canonical security migration prepared in task 05B.

Run it on a Supabase staging project first. Task 05C must take and verify a database and Storage backup before applying the same migration to production.

The migration removes the legacy `password_hash` column, moves project draft state to `projects.is_draft`, restricts public reads to published projects/documents/news, and creates the private `private-documents` bucket. It does **not** copy existing files from the public `project-images/documents/` paths. Before production execution, copy each existing document object to `private-documents`, replace its stored URL with a `storage://private-documents/<path>` reference, verify signed downloads while logged in, and only then remove the public copies.

Do not run `supabase_schema.sql` after this migration: it is a bootstrap schema only and intentionally contains no access policies.
