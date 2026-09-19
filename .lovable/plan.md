# Student portal and tutor document verification

## What will be built
- Add enrolled live classes to the student home schedule, alongside personal study tasks, with direct Academy access.
- Keep course materials available inside the Academy dashboard and add a clear home shortcut for enrolled students.
- Add optional PDF, Word, or text-file upload for Law moot court submissions; extract text for AI grading and retain the original file securely.
- Verify that tutor identity and qualification files appear in the matching admin review row.

## Technical details
- Query active enrolments first, then load today's live classes for those courses and merge them chronologically with study tasks.
- Add nullable file metadata to moot submissions and a private `moot-submissions` storage bucket with owner-only upload/read/delete access plus staff review access.
- Extend the grading function to validate stored file ownership and save file metadata with each graded submission.
- Use the selected tutor account for browser verification; it currently has no tutor application, so the full tutor-dashboard check requires completing its Tutor Sign Up application first.

## Validation
- Check desktop and mobile student home views.
- Submit a sample moot memorial file and confirm grading history records it.
- Confirm uploaded tutor documents are listed in the admin application review row.
