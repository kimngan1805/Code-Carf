-- Roles are reference data the app cannot work without (registration connects to them).
-- Insert them here so a database set up with `migrate deploy` is usable without running the seed.
INSERT INTO "Role" ("id", "name") VALUES
  ('role-student', 'STUDENT'),
  ('role-teacher', 'TEACHER'),
  ('role-admin', 'ADMIN'),
  ('role-grader', 'GRADER'),
  ('role-guest', 'GUEST')
ON CONFLICT ("name") DO NOTHING;
