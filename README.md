Evidence for PR #1075 (ENG-2729). Do not delete: the PR description links these files.

- `fidelity-feedback-e2e.gif` / `.mp4`: the workflow end to end on a local dev server: upload, cron transcription (Gemini), cron rating (gemini-2.5-pro), transcript and feedback dialogs. Long waits during the cron runs are cut to 3 s; the header email is blurred.
- `mock-session-1.mp3`: synthetic text-to-speech audio of a fictional Session 1 (script in `mock-session-1-script.txt`). It contains no real session audio.
- `*.png`: stills from the same run. All names and schools are seed data.
