# Executive AI Summary in Left Sidebar

## Problem

Reviewers currently see raw stats and rule-by-rule results without a high-level overview. They must manually synthesize the data to form an executive opinion, wasting time on a task the AI can do.

## Solution

Add an always-visible colored card at the top of the left sidebar (above the risk gauge) that displays the AI's executive summary of the review. Uses the existing `decision.reasoning` field.

## Visual Design

- Colored card background based on `recommendation`:
  - "Reject" → light red (`bg-red-50 dark:bg-red-950/30`)
  - "Approve" / "Approved" → light green (`bg-emerald-50 dark:bg-emerald-950/30`)
  - "Flag" / default → light amber (`bg-amber-50 dark:bg-amber-950/30`)
- Bold recommendation pill/badge at top of card
- `reasoning` text as regular body text below
- Positioned below group info banner, above risk gauge

## Data

Uses existing `evaluationDecision.reasoning` field. No new types.

## Files Changed

- `components/results/result-sidebar.tsx` — add ~20 lines JSX inline above risk gauge
- `app/data/evaluation_report_rh_group.json` — update `reasoning` field to human-readable executive summary

## Mock Reasoning Content

Replace stats-dump with human-readable executive summary covering:

- Application context (annual review, performing account, relationship since 2003)
- Key financial concern (first PBT loss RM-3.7M, revenue decline 7.2%)
- Critical compliance issues (6 breached T&Cs, unsecured 68.1%, MOA 314%)
- Mitigating strengths (positive net CFO, TNW RM58.9M)
- Data gaps (incomplete shareholding, missing period dates)
