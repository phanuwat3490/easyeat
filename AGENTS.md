<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Preserve the uploaded application's public paths using TanStack file routes, not React Router, to stay compatible with the project's routing runtime.
- Share customer/admin navigation through SiteShell in the root layout; the admin parent renders Outlet so all admin child screens mount correctly.
- Build source-backed screen forms and controls as presentation-only until the existing API is reachable; never call the uploaded localhost API or simulate successful persisted actions, because the user chose to retain their original system.
- Separate reusable form primitives, customer screens and admin screens under components/easy-eat; leaf routes retain their own metadata and delegate presentation to those modules for consistent design.
- Define visual styles and semantic tokens in src/styles.css and use the existing Button component for interactive commands to maintain a consistent design system.
- Keep registration presentation in its own screen and validate with a shared Zod schema; OTP view selection is not evidence of SMS delivery or verified registration.
