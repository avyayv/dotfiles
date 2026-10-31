# README Benchmark Notes

Research snapshot: 2026-07-27. GitHub star counts change over time; the counts below only establish that every repository exceeded the requested 10,000-star threshold when researched.

| Repository | Stars observed | Useful README lesson |
| --- | ---: | --- |
| [openai/codex](https://github.com/openai/codex) | 101,881 | A mature project can keep the landing page short when the quickstart is concrete and deeper documentation is strong. |
| [astral-sh/uv](https://github.com/astral-sh/uv) | 87,967 | Lead with a sharp one-line promise, a compact highlights section, verified install choices, and small examples organized by user goal. |
| [cli/cli](https://github.com/cli/cli) | 45,458 | A README may act as a trustworthy index instead of duplicating complete platform-specific documentation. |
| [nektos/act](https://github.com/nektos/act) | 71,224 | Short can work: explain the mechanism, link the user guide, and avoid pretending the README must contain the whole manual. |
| [charmbracelet/gum](https://github.com/charmbracelet/gum) | 24,102 | A concrete tutorial and visible output communicate composability better than a flag dump. |
| [jesseduffield/lazygit](https://github.com/jesseduffield/lazygit) | 80,789 | Voice and feature demos can make value immediately legible; extensive installation detail is justified only when the distribution channels really exist. |
| [starship/starship](https://github.com/starship/starship) | 59,108 | Installation is a sequence: prerequisites, install, shell activation, then configuration. Stopping at package installation is not a quickstart. |
| [sharkdp/bat](https://github.com/sharkdp/bat) | 59,894 | Put screenshots next to the behaviors they prove, then show scenario-based usage and integrations. |
| [BurntSushi/ripgrep](https://github.com/BurntSushi/ripgrep) | 66,590 | Answer both “why use it?” and “why not?”; explicit tradeoffs create more trust than universal claims. |
| [junegunn/fzf](https://github.com/junegunn/fzf) | 81,999 | Organize a large usage surface by real tasks and integrations, not by mirroring every CLI flag. |

## What the sample does not support

The sample does **not** establish one mandatory README template. Codex, GitHub CLI, and act are intentionally compact; fzf, bat, and lazygit are extensive. Length follows the product's onboarding burden and where the canonical documentation lives.

The sample also does not justify adding badges, logos, screenshots, GIFs, package-manager commands, performance claims, or license text when a project does not have verified artifacts for them. These are useful evidence, not decorations.

## Recurring pattern

The strongest common pattern is progressive disclosure:

1. Identify the product and its distinguishing value.
2. Show a verified path to a meaningful result.
3. Explain the concepts needed to understand that path.
4. Expand into common workflows, integrations, tradeoffs, and operations.
5. Link rather than duplicate the full manual.

Every step depends on repository evidence. A polished but fictional quickstart is worse than an honest “task creation is manual” or “this package is not published yet.”
