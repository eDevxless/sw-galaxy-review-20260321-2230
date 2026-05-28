Deploy checklist and commands

Local preview (uses http-server via npx):

```bash
npm run serve
# then open http://localhost:8080/Website/index.html
```

Netlify (manual via CLI):

```bash
# Install netlify CLI if not present
npm i -g netlify-cli
# From repo root
netlify deploy --dir=Website --prod
```

Netlify (GUI):
- In Netlify site settings, set the deploy publish directory to `Website`.
- If using repository deploys, set the build command to empty (static) and the publish directory to `Website`.

Vercel:
- Run `vercel` from repo root and follow prompts. `vercel.json` currently sets `outputDirectory` to `.` so it will deploy repository root; prefer to select the `Website` folder as root when deploying interactively.

Notes:
- This project is primarily static files. There is no build script in `package.json`.
- If you use a host that expects a build step, add a build script and adjust the publish directory accordingly.
