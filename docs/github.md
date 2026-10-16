# GitHub integration

The template repository and each content repository have separate histories. `template.lock.json` in a content repository records:

```json
{
  "schemaVersion": 1,
  "repository": "owner/template-repository",
  "revision": "a-full-40-character-commit-sha"
}
```

The template's initializer writes a real repository name and current commit SHA. Review a template upgrade, update the pin, build the content against that revision and commit the new pin. A normal content edit does not require modifying the template.

The workflow in [examples/validate-content.yml](examples/validate-content.yml) checks out the pinned template, builds the content and uploads a preview artifact. Copy it into a content repository's `.github/workflows/` directory. It has read-only repository permissions and does not publish a site. The referenced template must be accessible; cross-repository private checkouts require separately configured access.

The template's own Actions workflow checks types, tests, root/subpath output and independent content fixtures. On the upstream template repository's `main` branch, successful checks also build and deploy the bundled fictional example to [GitHub Pages](https://zzxzzk115.github.io/academic-casual-template/). Pull requests and other repositories only run validation. No custom secrets are needed.

The demo builder always copies `examples/minimal` into an isolated staging directory. It takes the Pages origin/base path from `actions/configure-pages` and never reads a separate personal content repository. To reproduce that production output locally:

```sh
pnpm demo:build --url https://zzxzzk115.github.io --base /academic-casual-template/
```

Output is written to `.cache/demo-dist` and verified before upload. To deploy a fork's demo, deliberately update the workflow's repository guard and enable Pages with the GitHub Actions source in that fork. This does not configure any content repository's deployment.

## GitHub Pages

Deploy the generated output directory after inspecting it. It includes `.nojekyll`, search assets, RSS, sitemap, bibliography and bundled fonts. Set the content configuration to match the destination:

| Destination | `site.url` | `site.base` |
| --- | --- | --- |
| `owner.github.io` | `https://owner.github.io` | `/` |
| Project site `owner.github.io/portfolio/` | `https://owner.github.io` | `/portfolio/` |
| Custom domain | `https://your-domain.example` | `/` |

For native Pages deployment, add upload/deploy Pages steps and select GitHub Actions as the publishing source in repository settings. Apply write permissions only to the deployment job. For a branch-based workflow, publish only the output directory to the chosen output branch. Those are deployment choices for the content repository; this template does not change repository settings.

Keep a source tag and an output backup before replacing an existing site. An independent blog at `/blog/` should continue using its own build/deployment and must not be copied into the homepage build.
