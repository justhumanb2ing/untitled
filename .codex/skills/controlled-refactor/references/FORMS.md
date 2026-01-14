# Controlled Refactor Output Format

Use the following headings in this exact order.

## 1) Step Applied
Repeat the step title and brief intent.

## 2) Files Changed
List files touched (paths). If new files, list them.

## 3) Patch
Provide updated code for each changed file using fenced code blocks.
If multiple files, present in this order:
- new files first
- then modified files

## 4) What stayed the same
State explicitly what behavior/API/UX was preserved (assumptions allowed).

## 5) Verification checklist
List checks to run/confirm (from VERIFICATION_CHECKLIST.md).

## 6) Notes / Risks
Mention any risk or assumption.
