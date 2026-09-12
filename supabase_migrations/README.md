# Supabase migrations

`20260910_05b_security_hardening.sql` is the canonical security migration prepared in task 05B.

Run it on a Supabase staging project first. Task 05C must take and verify a database and Storage backup before applying the same migration to production.

The migration removes the legacy `password_hash` column, moves project draft state to `projects.is_draft`, restricts public reads to published projects/documents/news, and creates the private `private-documents` bucket. It does **not** copy existing files from the public `project-images/documents/` paths. Before production execution, copy each existing document object to `private-documents`, replace its stored URL with a `storage://private-documents/<path>` reference, verify signed downloads while logged in, and only then remove the public copies.

Do not run `supabase_schema.sql` after this migration: it is a bootstrap schema only and intentionally contains no access policies.

After 05C, run `20260911_document_storage_grouping.sql`. It verifies that every legacy URL stored in document metadata has a corresponding private object, converts those metadata URLs to `storage://private-documents/...`, and enforces the correct private folder for forms, legal documents, packages, and guides.
# 20260911_project_publication.sql

Adds stable project slugs, previous-slug history, and an update timestamp. Run it after `20260910_05b_security_hardening.sql`, then deploy the matching static build. It is safe to re-run, but test on staging first whenever a staging database exists.
