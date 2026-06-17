# Review History Section

## Summary

Add a "Review History" table to the Upload step (step 1), below the loan application dropzone. The table lists past reviews fetched from the retriever API. Each row has a View button that loads that review's data into the Zustand store and navigates to the results step (step 3).

## API

- **Endpoint:** `GET {NEXT_PUBLIC_PROXY_URL_V2}/smart-api/hl_retriever`
- **Response shape:** `{ result: "<JSON stringified array of history items>" }`
- **Each item:** `{ id, filename, created_at, updated_at, ca (JSON string), result (JSON string), summary (JSON string), decision (JSON string) }`
- **Filter:** Only display items where `result` parses to a non-empty array

## Data Layer

### New type (`types/review.ts`)

```ts
export interface ReviewHistoryItem {
  id: number
  filename: string
  created_at: string
  updated_at: string
  ca: string
  result: string
  summary: string
  decision: string
}
```

### Store changes (`store/loan-review.ts`)

- Add `reviewHistory: ReviewHistoryItem[]` to state (default `[]`)
- Add `fetchReviewHistory()` action:
  - GET `{NEXT_PUBLIC_PROXY_URL_V2}/smart-api/hl_retriever`
  - Parse outer `result` string as JSON array
  - Filter to items with non-empty parsed `result` array
  - Set `reviewHistory`
- Add `viewHistoryItem(item: ReviewHistoryItem)` action:
  - Parse `ca`, `result`, `summary`, `decision` (all JSON strings)
  - Call existing `transformToReviewResult()` with the parsed data
  - Set `result` and `step: 3` in store
- Update `reset()` to clear `reviewHistory` to `[]`

## UI Component

### New component (`components/review-history.tsx`)

- Section heading: "Review History"
- HTML table, 4 columns: #, Filename, Created At, View
- Data source: `useLoanReviewStore().reviewHistory`
- View button per row calls `viewHistoryItem(item)`
- Date formatting on `created_at` (e.g., "22 Apr 2026, 5:22 AM")
- Loading state: spinner while fetching
- Empty state: "No previous reviews" text
- Error state: muted "Could not load review history" message

### Upload step changes (`components/upload-step.tsx`)

- Below existing `<FileUpload>`, add `<Separator />` then `<ReviewHistory />`

## Data Flow & Edge Cases

- **Fetch timing:** `useEffect` in ReviewHistory on mount. Guard against refetch if `reviewHistory.length > 0`.
- **Error handling:** Non-blocking — show error text, upload flow unaffected.
- **Reset:** Going back to step 1 from step 3 re-mounts ReviewHistory, which refetches.
- **No pagination:** Flat table, sufficient for ~15 items.
