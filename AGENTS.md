# Agent instructions — CFPN542-OptIn-mockup

## Skills

Skills are **not** stored in this repo. They live globally on this machine at:

```
C:\Users\philo\.agents\skills\
```

`./.agents/skills/` in this project is a **Windows directory junction** to that global folder, so paths still resolve as if the skills were local.

Skills currently relevant to this project:

- `mobile-android-design` — Material 3, Compose, Android navigation patterns.
- `responsive-design` — Breakpoints, container queries, fluid layouts.
- `ui-ux-pro-max` — UX/product design playbook.

To author or edit a skill, edit the source under `C:\Users\philo\.agents\skills\<skill-name>\`. Do **not** add files inside `./.agents/skills/` directly — they would land in the global folder and affect every project.

To add a new skill that should be visible here, create it under the global path; the junction will surface it automatically.

See `C:\Users\philo\.agents\skills\README.md` for the full layout and authoring guide.
