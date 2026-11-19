# Handwritten answer upload (#37)

A learner photographs a paper answer and uploads it for an exercise of kind `HANDWRITTEN`.
Grading (AI draft, then a grader's decision) builds on the stored submission and is a separate task.

## Rules

- **Formats and size:** JPG, PNG or WebP, at most 5 MB. The type comes from the file's first bytes, not from
  the file name or the browser's `Content-Type`, so a renamed PDF or text file is refused.
  Errors are `400 INVALID_IMAGE_TYPE`, `400 EMPTY_IMAGE` and `413 IMAGE_TOO_LARGE`, each with a message for the learner.
- **Private storage:** the file goes to the shared `FileStorage` (`src/lib/storage.ts`) under
  `handwritten/<random uuid>.<ext>`. The key is random, and the bucket/directory is never public.
  `Submission.imageUrl` holds that storage key (despite the name it is **not** a link); it is never returned to the browser.
- **Owner only:** `GET /api/submissions/:id/image` streams the file to the learner who uploaded it. Someone else's
  submission, a missing one and a code submission all answer the same `404`, so the response never confirms that
  another learner's image exists. Teachers and graders cannot read it yet; the grader review task adds that.
- **Resubmitting:** there is one submission per learner and exercise. Uploading again swaps its image and returns it to
  `PENDING`, clearing the AI score and feedback computed for the old image. It is refused with `409 SUBMISSION_FINALIZED`
  once the answer is `ACCEPTED` or `REJECTED`. In a contest it is also refused after the attempt deadline
  (`CONTEST_NOT_OPEN`); that check runs again inside the transaction, under the participant lock.
- **Cleanup order:** the new file is stored first, the database row is swapped in one transaction, and only then is the
  old file deleted. If the transaction fails, the new file is removed and the old image stays.
  Parallel uploads are serialized with a per-learner, per-exercise advisory lock, so they cannot create two submissions.

## API

`POST /api/exercises/:exerciseId/handwritten` — `multipart/form-data`

| Field     | Required | Meaning                                              |
| --------- | -------- | ---------------------------------------------------- |
| `image`   | yes      | The photo.                                           |
| `contest` | no       | Contest slug, only when answering inside an attempt. |

Returns `201` for a first upload and `200` for a replacement, with `{ id, submittedAt }`. Students only. Requests larger
than the limit are refused before the body is read.

## Where it appears

Practice: the room page links a handwritten exercise to `/hv/exercises/:id`, which shows the prompt, the learner's
current image and the upload form. The contest workspace UI does not offer handwritten exercises yet; the API and
service already support the `contest` field.

## Checking it

`npm test` runs the rules and service tests. `upload.integration.test.ts` runs against PostgreSQL when it is reachable
(`docker compose up -d db`, then `npm run db:deploy`) and covers storage, owner-only reads, replacement, parallel
uploads, graded submissions and the contest deadline.

By hand, with `STORAGE_DIR` pointing at a scratch directory: sign in as a student, open a room that has a handwritten
exercise, then try a text file renamed to `.png`, a PDF, and an image over 5 MB (each shows its error), upload a valid
photo, upload another to replace it, and confirm the folder still holds one file. A second student requesting
`/api/submissions/<id>/image` gets `404`.
