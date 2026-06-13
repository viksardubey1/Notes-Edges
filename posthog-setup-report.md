<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into Notes & Edges. PostHog is initialized via `instrumentation-client.ts` (the Next.js 15.3+ approach) with a reverse proxy through `/ingest` to avoid ad-blockers. Server-side tracking is powered by `posthog-node` via a shared `getPostHogClient()` helper. Users are identified on both login and signup — client-side via `posthog.identify()` and server-side via the PostHog Node SDK — ensuring full correlation of events across the stack. Error capture is enabled globally via `capture_exceptions: true`.

| Event | Description | File |
|---|---|---|
| `user_signed_up` | User completes email signup form successfully | `src/app/(auth)/signup/page.tsx` |
| `user_signed_in` | User completes email login form successfully | `src/app/(auth)/login/page.tsx` |
| `graph_generated` | AI successfully extracts a knowledge graph from notes or PDF | `src/app/(app)/welcome/page.tsx` |
| `graph_generation_failed` | Graph extraction failed with an error | `src/app/(app)/welcome/page.tsx` |
| `graph_opened` | User opens a graph from the home dashboard | `src/app/(app)/home/page.tsx` |
| `graph_deleted` | User deletes a graph from the home dashboard | `src/app/(app)/home/page.tsx` |
| `graph_shared` | User copies the share link for a graph | `src/components/layout/CommandBar.tsx` |
| `graph_renamed` | User renames a graph via the command bar | `src/components/layout/CommandBar.tsx` |
| `graph_copied` | User makes a copy of a graph they don't own | `src/components/layout/CommandBar.tsx` |
| `graph_notes_appended` | User adds new notes to an existing graph (append mode) | `src/components/panels/UploadSheet.tsx` |
| `graph_replaced` | User replaces an existing graph with new notes | `src/components/panels/UploadSheet.tsx` |
| `server_signup` | Server-side: user creates an account via the signup API | `src/app/api/auth/signup/route.ts` |
| `server_login` | Server-side: user authenticates via the login API | `src/app/api/auth/login/route.ts` |
| `server_graph_extracted` | Server-side: knowledge graph successfully extracted by AI | `src/app/api/extract-graph/route.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics dashboard](/dashboard/1643540)
- [New user signups over time](/insights/vJiLbi43)
- [Graphs generated over time](/insights/snClxSaC)
- [Graph generation success vs failure](/insights/V52pHTm2)
- [Graph sharing & copying](/insights/23elcTcX)
- [Signup to first graph funnel](/insights/9WyB6bZ3)

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
