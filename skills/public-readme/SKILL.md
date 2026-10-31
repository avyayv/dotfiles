---
name: public-readme
description: Create or improve a polished, public-facing README for an open-source project. Verify all claims against the repository and use a logo-first, media-led layout with clear setup and usage instructions.
---

# Public README Skill

Create a README that helps a first-time visitor quickly recognize the project, understand its value, see it in action, and get started. Verify every project-specific claim against the repository. Use the structure below as the default, adapting or omitting elements that the project does not have. Never invent assets, links, capabilities, installation methods, or status badges to fill a slot.

## Default README structure

Use this order unless the project has a clear reason to differ:

1. Logo
2. Project name
3. Horizontal rule
4. Short headline and description
5. Prominent project links, styled consistently as buttons
6. CI status and license badges
7. Product GIF or other visual demonstration
8. Practical instructions: installation, quick start, usage, configuration, development, and related documentation as applicable

### Logo and name

- Lead with the project's real logo, centered and linked to the project's main site or repository when appropriate. Prefer an existing, checked-in asset or a verified official hosted asset. Do not create or guess a logo URL.
- Follow with the project name as a centered level-one heading.
- If the project has no suitable logo, omit the logo block rather than using an unrelated image.

Example:

```html
<p align="center">
  <a href="https://example.com">
    <img src="docs/logo.svg" alt="Example project" width="72">
  </a>
</p>

<h1 align="center">Example</h1>
```

### Headline and description

Put a horizontal rule after the name, then a concise headline and one- or two-sentence description. The headline should say the useful outcome, not merely classify the software. The description should explain what the project does and who it is for in concrete, accurate language.

Example:

```markdown
---

<p align="center">
  <strong>Find the best models for your repository.</strong><br>
  Run private coding-agent benchmarks built from your own merged pull requests.
</p>
```

Avoid vague claims such as “revolutionary,” “best-in-class,” or “easy to use” unless there is a specific, supportable reason to say so.

### Project links as buttons

Place the most useful destinations directly under the description. Use a consistent shields.io `for-the-badge` style so the links read as a row of buttons. Choose links that actually exist and matter to a new visitor, such as the live app, documentation, releases, or a getting-started guide. Do not add empty or speculative buttons.

Example:

```html
<p align="center">
  <a href="https://example.com"><img src="https://img.shields.io/badge/Website-Visit-111111?style=for-the-badge" alt="Visit the website"></a>
  <a href="https://docs.example.com"><img src="https://img.shields.io/badge/Docs-Read-0f9d76?style=for-the-badge" alt="Read the documentation"></a>
</p>
```

Use clear labels and descriptive alt text. Ensure each badge destination and image URL is valid. Keep the links visually consistent; do not mix several unrelated badge styles in this row.

### CI and license badges

Below the project-link buttons, show a CI passing/failing badge and a license badge when they are applicable and verifiable. Use the actual workflow and license paths from this repository. A GitHub Actions badge should resolve to the project's real workflow; the license badge should only appear if a root license applies to the project. Omit a badge when its underlying status or target cannot be verified. Never imply CI is passing by using a static green badge.

Example:

```html
<p align="center">
  <a href="https://github.com/OWNER/REPO/actions/workflows/ci.yml"><img src="https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/OWNER/REPO" alt="License"></a>
</p>
```

Check the workflow filename and license before using this example. If the project has no license file, omit the license badge and do not claim a license.

### GIF or other product visual

After the badges, show a short, genuine product GIF or other useful visual demonstration when one exists. Prefer a checked-in asset that demonstrates the actual project. Make it large enough to understand, provide meaningful alt text, and link it only if a relevant destination exists. Do not commit a fabricated mockup or an unrelated stock image. If the repository has no suitable visual, omit the section; do not block README work on producing one.

Example:

```html
<p align="center">
  <a href="https://example.com">
    <img src="docs/media/demo.gif" alt="Demonstration of the main project workflow" width="100%">
  </a>
</p>
```

### Instructions after the introduction

After the visual, give the reader the instructions they need, in the order that fits the project. Keep the first useful action easy to find.

- **Quick start:** Show the shortest verified path to a meaningful result. Include prerequisites and required credentials or services. Commands must work after replacing only clearly explained user-specific values. If setup is substantial, call it “Getting started” or “Self-hosting,” not a quick start.
- **Installation:** Document only distribution channels that exist and are maintained. Verify package names, versions, and commands against project metadata and official release sources. If there is no published installer, say so and give the real source-build path when practical.
- **Usage:** Organize examples around real user goals or workflows, not a dump of every flag. Commands and flags must match the implementation or its help output. Include expected output or a short explanation where it helps.
- **Configuration:** Explain relevant config files, environment variables, credentials, and defaults. Never expose secrets or document private/internal configuration in a public README.
- **Development and contributing:** Include concise, verified setup and test commands. Link to existing contribution guidance rather than duplicating it.
- **Further reading:** Link to existing documentation, API references, examples, and support channels where useful. Keep the README useful on its own; links should extend it, not replace basic instructions.
- **Limitations and FAQ:** Explain important prerequisites, tradeoffs, or known constraints that affect whether someone can use the project. Be specific and candid.
- **License:** State the license only after inspecting the actual license file and confirming its scope. Mention package-specific exceptions when relevant.

Use headings to make the material scannable. Prefer short explanations paired with runnable examples. Do not add sections just to satisfy a template.

## Required fact-checks

Before drafting or editing, inspect the repository and verify the details that will appear in the README:

1. **Project identity and capabilities:** Read the existing README, source entry points, and project metadata. Describe what works today, not roadmap items or aspirational claims.
2. **Install and quick-start commands:** Check package metadata, scripts, installation files, and official release channels. Run commands when practical. Do not present commands with unexplained placeholders or dependencies as copy-pasteable quick starts.
3. **Usage examples:** Verify CLI flags against `--help` or source. Verify API names, paths, configuration keys, and expected outputs against the implementation or authoritative docs.
4. **Badges and links:** Confirm the workflow, repository owner/name, license path, and all linked destinations. Omit broken or unverifiable badges.
5. **License:** Read the license file and confirm it applies to the described project. Do not infer a license from a badge, package metadata, or a neighboring directory.
6. **Media:** Confirm every image and GIF exists and accurately depicts the project. Prefer relative links for repository assets so they work in forks.
7. **Public/private boundary:** Check repository guidance and tracked files. Exclude internal-only paths, private infrastructure details, secret names, and credentials from public-facing documentation.
8. **Existing useful content:** Preserve accurate setup instructions, limitations, and links. Improve organization without deleting important caveats.

When facts cannot be verified, omit the claim or clearly qualify it. Never invent results, performance numbers, integrations, supported platforms, or community adoption.

## Workflow

1. Read repository guidance (`AGENTS.md` and relevant project instructions), root files, existing README, metadata, source entry points, CI workflows, license, and media assets.
2. Identify the project's audience, core outcome, real first-use path, and the strongest available visual.
3. Verify the facts and links using the checklist above.
4. Draft using the default structure, omitting unsupported or unavailable elements.
5. Review the README as a first-time visitor: Can they tell what the project is, why it may help, where to click, and what to do first? Are prerequisites and limitations clear? Are the instructions actionable without guessing?
6. Recheck every command, claim, badge, and asset after editing. Fix any gaps found in the review.

## Writing principles

- Put identity and value before implementation detail.
- Be direct, concrete, and accurate; favor examples over promotional copy.
- Keep the opening compact. Put deeper setup and reference material below the introduction.
- Match the sophistication of the project; the template is a guide, not a demand for boilerplate.
- Do not include benchmark-repository comparisons, popularity claims, or references to external README collections as evidence. Use a user-provided example for visual direction, but verify all project-specific content against the target repository.
