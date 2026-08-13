# Fixing "The video service is temporarily out of capacity"

## What's actually happening

That message is not a glitch and not a bug in the generation pipeline. The video
engine is rejecting every request with a "payment required" response, and the app
translates that into the friendly "out of capacity" wording.

The reason is the workspace AI balance: **1.70 credits remaining out of a 10 credit
grant** for this billing period. A single 8-second Veo clip costs far more than that,
and the engine checks the full price up front before it starts — so it refuses
immediately. No amount of retrying or code change will make a generation succeed
until the balance is topped up.

Cost context, so the expectation is clear: every 8 seconds of finished video is one
paid engine call. A 1-minute video = 8 calls; a 6-minute video = 45 calls. Long videos
are genuinely expensive.

## What I'll change in the app

Code can't create credits, but it can stop the app from behaving badly around this
limit and stop wasting the credits that remain.

**1. Tell the truth in the UI**
Replace the misleading "temporarily out of capacity — try again shortly" with an
accurate message: the AI video balance is exhausted, generations will work again once
credits are added, plus a link to the billing/upgrade page. "Try again shortly" is
removed for this case so users stop retrying into a wall.

**2. Pre-flight check before spending anything**
Before planning scenes or reserving app credits, submit the first take and confirm the
engine accepts it. If it returns the payment error, fail instantly with the message
above, refund the full app-credit reservation, and skip the AI scene planning call
(which currently burns balance on every doomed attempt).

**3. Cheapest viable defaults**
Default the studio to the Fast tier (`veo-3.1-lite`) at 720p, which is the lowest
cost per second the engine offers, and default duration stays at the shortest option.
Higher tiers and 1080p stay selectable, with their relative cost shown next to them so
the choice is deliberate.

**4. Mid-run exhaustion handled cleanly**
If the balance runs out partway through a multi-scene film, the job stops at the last
completed scene instead of hanging: already-rendered scenes stay available and
playable, unused app credits are refunded, and the job is marked with the real reason.

**5. Distinguish the three failure kinds**
Payment, rate-limit, and genuine provider errors currently blur together in the copy.
Each gets its own message and its own retry behaviour (retry only makes sense for
rate-limit and transient errors).

## What you need to do

Add credits to the workspace (or wait for the next daily grant, which restores a small
amount). Until then the studio will show the accurate "balance exhausted" state rather
than failing generations silently.

## Technical notes

- `lovable.server.ts`: keep the 402/429 split, but surface the gateway's own message.
- `generation.server.ts`: move the first `createJob` call ahead of `spend_credits` and
  `planScenes`; add an `OUT_OF_CREDITS` branch in `advanceJob` that finalises the job as
  partially complete rather than failed-and-wiped.
- `friendlyError`: distinct copy per error class, with a billing CTA for the payment case.
- `options.ts` / `studio.tsx`: default tier `fast`, default resolution `720p`, per-tier
  cost hints.

## Verification

Attempt a generation and confirm: no app credits are deducted, no AI planning call is
made, and the studio shows the accurate balance message instead of "out of capacity".
