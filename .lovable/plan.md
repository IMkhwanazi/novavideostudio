# Long-form video generation (up to 6 minutes)

## The problem today
The studio offers durations from 1 to 6 minutes, but the underlying video engine only
produces clips of 4, 6, or 8 seconds. The app currently asks it for "60" to "360"
seconds, which the engine rejects outright — so every long generation fails. Nothing
in the UI needs to change conceptually; the engine work does.

## What gets built

**1. Scene planning**
When a generation starts, the AI turns the prompt into a numbered scene list — one
scene per 8-second segment (a 6-minute video = 45 scenes). A shared "continuity brief"
(characters, wardrobe, palette, location, lens, lighting) is generated once and injected
into every scene prompt so the segments look like one film rather than 45 unrelated clips.

**2. Sequential segment generation**
Segments are generated one at a time (the engine limits concurrent jobs), each stored
in the user's private storage as it completes. Failures on a single segment are retried
once, then the whole job fails cleanly and unused credits are refunded.

**3. Real progress**
The studio shows "Scene 12 of 45", a real percentage, elapsed/estimated time, and
thumbnails of finished scenes. Completed segments are previewable while later ones
are still rendering. Cancel stops after the current segment and refunds the rest.

**4. One downloadable MP4**
Once all segments finish, the browser merges them into a single MP4 (no re-encoding,
so it's fast) and uploads that merged file back to storage as the project's final video.
Until the merge finishes, the player plays segments seamlessly back-to-back.

**5. Expectation setting**
The duration picker shows the realistic cost and wait for each length (e.g.
"6 min - 45 scenes, ~60-90 min, N credits"), with a clear warning above ~2 minutes.
Default stays at 1 minute.

## Technical notes

- New table `generation_segments` (generation_id, index, scene_prompt, provider_job_id,
  status, video_path, error) with owner-scoped RLS and grants.
- `provider.server.ts` / `lovable.server.ts`: `seconds` is always "4" | "6" | "8";
  1080p forces "8". Segment count = ceil(duration / 8).
- New `src/lib/video/planner.server.ts`: AI scene breakdown + continuity brief via the
  existing AI gateway helpers, with a deterministic fallback if planning fails.
- `generation.server.ts`: `advanceJob` becomes a segment state machine — poll current
  segment, store it, start the next, aggregate progress, finish when all are stored.
- Client polling interval raised to ~10s and kept alive across navigation within the studio.
- Merge uses `@ffmpeg/ffmpeg` (wasm) in the browser with stream copy concat, then
  uploads `final.mp4` to the `videos` bucket and points the project at it.
- Credits are reserved for the full duration up front and partially refunded for any
  segments that never ran.
- Errors are surfaced per segment with plain-language messages; the job never hangs
  in a silent state.

## Verification
End-to-end run of a short (1 min / 8 scenes) generation in a headless browser: scenes
plan, segments generate and store, progress advances, merge produces a playable MP4,
credits reconcile, and the console stays error-free.
