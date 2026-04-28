package main

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"
)

var validAgents = map[string]bool{"codex": true, "claude": true, "pi": true}

type config struct {
	agents  []string
	session string
	prompt  string
}

type candidate struct {
	agent  string
	cmd    string
	path   string
	branch string
	pane   string
}

func main() {
	if err := run(os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run(args []string) error {
	cfg, err := parseArgs(args)
	if err != nil {
		return err
	}
	if err := requireCommands(append(cfg.agents, "tmux", "git", "pi")); err != nil {
		return err
	}

	sourceDir, err := output("git", "rev-parse", "--show-toplevel")
	if err != nil {
		return errors.New("agenttab must be run inside a git repository")
	}
	sourceDir = strings.TrimSpace(sourceDir)
	repoName := filepath.Base(sourceDir)
	currentRef, _ := outputIn(sourceDir, "git", "rev-parse", "--abbrev-ref", "HEAD")
	currentRef = strings.TrimSpace(currentRef)
	if currentRef == "HEAD" || currentRef == "" {
		currentRef, _ = outputIn(sourceDir, "git", "rev-parse", "--short", "HEAD")
		currentRef = strings.TrimSpace(currentRef)
	}
	safeRef := sanitize(currentRef)
	stamp := fmt.Sprintf("%s-%d", time.Now().Format("20060102-150405"), os.Getpid())

	wtBase := filepath.Join(homeDir(), ".avyay-worktrees")
	if err := os.MkdirAll(wtBase, 0o755); err != nil {
		return err
	}

	patchFile, cleanupPatch, err := makePatch(sourceDir)
	if err != nil {
		return err
	}
	defer cleanupPatch()

	candidates := make([]candidate, 0, len(cfg.agents))
	fmt.Println("Creating worktrees:")
	for _, agent := range cfg.agents {
		cand := candidate{
			agent:  agent,
			cmd:    agentCommand(agent),
			path:   filepath.Join(wtBase, fmt.Sprintf("%s-%s-agenttab-%s-%s", repoName, safeRef, agent, stamp)),
			branch: fmt.Sprintf("agenttab/%s/%s-%s", safeRef, agent, stamp),
		}
		fmt.Printf("  %s -> %s\n", cand.agent, cand.path)
		if err := commandIn(sourceDir, "git", "worktree", "add", "-b", cand.branch, cand.path, "HEAD").Run(); err != nil {
			return fmt.Errorf("failed to create %s; any already-created worktrees were left in place for manual review: %w", cand.path, err)
		}
		candidates = append(candidates, cand)
	}

	for _, cand := range candidates {
		if err := copyWorktreeContext(sourceDir, cand.path, patchFile); err != nil {
			fmt.Fprintf(os.Stderr, "Warning: could not copy all local context into %s: %v\n", cand.path, err)
		}
	}

	judgePrompt := buildJudgePrompt(cfg.prompt, candidates)
	if os.Getenv("TMUX") != "" {
		return openInsideTmux(sourceDir, cfg, candidates, judgePrompt)
	}
	return openNewTmuxSession(sourceDir, cfg, candidates, judgePrompt)
}

func parseArgs(args []string) (config, error) {
	cfg := config{}
	positional := []string{}
	for i := 0; i < len(args); i++ {
		if args[i] == "--" {
			cfg.prompt = strings.Join(args[i+1:], " ")
			break
		}
		positional = append(positional, args[i])
	}
	if len(positional) > 0 && (positional[0] == "--help" || positional[0] == "-h") {
		usage()
		os.Exit(0)
	}
	if len(positional) > 0 && positional[0] == "all" {
		cfg.agents = []string{"codex", "claude", "pi"}
		if len(positional) > 2 {
			return cfg, errors.New("usage: agenttab all [session_name] [-- prompt]")
		}
		if len(positional) == 2 {
			cfg.session = positional[1]
		}
		return cfg, nil
	}
	for _, arg := range positional {
		if validAgents[arg] {
			if cfg.session != "" {
				return cfg, errors.New("agent names must come before session_name")
			}
			cfg.agents = append(cfg.agents, arg)
			continue
		}
		if cfg.session != "" {
			return cfg, fmt.Errorf("unexpected argument: %s", arg)
		}
		cfg.session = arg
	}
	if len(cfg.agents) == 0 {
		cfg.agents = []string{"codex", "pi"}
	}
	if len(cfg.agents) < 2 || len(cfg.agents) > 3 {
		return cfg, errors.New("pick two agents, or use: agenttab all")
	}
	seen := map[string]bool{}
	for _, agent := range cfg.agents {
		if seen[agent] {
			return cfg, errors.New("pick different agents")
		}
		seen[agent] = true
	}
	return cfg, nil
}

func usage() {
	fmt.Println("Usage: agenttab [all|codex|pi|claude] [codex|pi|claude] [codex|pi|claude] [session_name] [-- prompt]")
	fmt.Println("Examples:")
	fmt.Println("  agenttab")
	fmt.Println("  agenttab codex claude -- 'implement X'")
	fmt.Println("  agenttab all -- 'implement X'")
}

func agentCommand(agent string) string {
	switch agent {
	case "codex", "claude":
		return agent + " --yolo"
	default:
		return "pi"
	}
}

func openInsideTmux(sourceDir string, cfg config, candidates []candidate, judgePrompt string) error {
	session, err := output("tmux", "display-message", "-p", "#S")
	if err != nil {
		return err
	}
	session = strings.TrimSpace(session)
	currentPane, _ := output("tmux", "display-message", "-p", "#{pane_id}")
	currentPane = strings.TrimSpace(currentPane)

	firstPane, err := output("tmux", "new-window", "-P", "-F", "#{pane_id}", "-t", session+":", "-n", "ab-test", "-c", candidates[0].path, shellCmd(candidates[0].cmd))
	if err != nil {
		return err
	}
	candidates[0].pane = strings.TrimSpace(firstPane)
	windowIndex, _ := output("tmux", "display-message", "-p", "-t", candidates[0].pane, "#I")
	windowTarget := session + ":" + strings.TrimSpace(windowIndex)

	secondPane, err := output("tmux", "split-window", "-P", "-F", "#{pane_id}", "-h", "-t", windowTarget, "-c", candidates[1].path, shellCmd(candidates[1].cmd))
	if err != nil {
		return err
	}
	candidates[1].pane = strings.TrimSpace(secondPane)
	if len(candidates) == 3 {
		thirdPane, err := output("tmux", "split-window", "-P", "-F", "#{pane_id}", "-v", "-t", candidates[1].pane, "-c", candidates[2].path, shellCmd(candidates[2].cmd))
		if err != nil {
			return err
		}
		candidates[2].pane = strings.TrimSpace(thirdPane)
	}
	_ = command("tmux", "select-layout", "-t", windowTarget, "tiled").Run()
	for _, cand := range candidates {
		sendPrompt(cand.pane, cfg.prompt)
	}
	sendPrompt(currentPane, judgePrompt)
	fmt.Printf("Opened %s contestants. Starting pi judge here.\n", strings.Join(cfg.agents, ", "))
	return syscall.Exec(findExecutable("pi"), []string{"pi"}, os.Environ())
}

func openNewTmuxSession(sourceDir string, cfg config, candidates []candidate, judgePrompt string) error {
	base := cfg.session
	if base == "" {
		base = "agenttab-ab-test"
	}
	session := base
	for i := 2; command("tmux", "has-session", "-t", session).Run() == nil; i++ {
		session = fmt.Sprintf("%s-%d", base, i)
	}
	if err := command("tmux", "new-session", "-d", "-s", session, "-n", "judge", "-c", sourceDir, shellCmd("pi")).Run(); err != nil {
		return err
	}
	judgePane, _ := output("tmux", "list-panes", "-t", session+":", "-F", "#{pane_id}")
	judgePane = strings.TrimSpace(strings.Split(judgePane, "\n")[0])
	judgeWindow, _ := output("tmux", "display-message", "-p", "-t", judgePane, "#I")
	judgeWindow = strings.TrimSpace(judgeWindow)

	firstPane, err := output("tmux", "new-window", "-P", "-F", "#{pane_id}", "-t", session+":", "-n", "ab-test", "-c", candidates[0].path, shellCmd(candidates[0].cmd))
	if err != nil {
		return err
	}
	candidates[0].pane = strings.TrimSpace(firstPane)
	windowIndex, _ := output("tmux", "display-message", "-p", "-t", candidates[0].pane, "#I")
	windowTarget := session + ":" + strings.TrimSpace(windowIndex)

	secondPane, err := output("tmux", "split-window", "-P", "-F", "#{pane_id}", "-h", "-t", windowTarget, "-c", candidates[1].path, shellCmd(candidates[1].cmd))
	if err != nil {
		return err
	}
	candidates[1].pane = strings.TrimSpace(secondPane)
	if len(candidates) == 3 {
		thirdPane, err := output("tmux", "split-window", "-P", "-F", "#{pane_id}", "-v", "-t", candidates[1].pane, "-c", candidates[2].path, shellCmd(candidates[2].cmd))
		if err != nil {
			return err
		}
		candidates[2].pane = strings.TrimSpace(thirdPane)
	}
	_ = command("tmux", "select-layout", "-t", windowTarget, "tiled").Run()
	for _, cand := range candidates {
		sendPrompt(cand.pane, cfg.prompt)
	}
	sendPrompt(judgePane, judgePrompt)
	_ = command("tmux", "select-window", "-t", session+":"+judgeWindow).Run()
	return command("tmux", "-CC", "attach", "-t", session).Run()
}

func buildJudgePrompt(prompt string, candidates []candidate) string {
	if prompt == "" {
		return ""
	}
	var b strings.Builder
	b.WriteString("You are the judge/coordinator for a coding-agent A/B test.\n\n")
	b.WriteString("Original task:\n")
	b.WriteString(prompt)
	b.WriteString("\n\nContestants:\n")
	for _, cand := range candidates {
		b.WriteString(fmt.Sprintf("- %s in %s (branch %s)\n", cand.agent, cand.path, cand.branch))
	}
	b.WriteString("\nDo not judge yet. Wait until I explicitly tell you the contestants are done and ask you to judge.\n\n")
	b.WriteString("When I ask you to judge: inspect the candidate worktrees, compare their diffs and checks, pick the best one first, then ask before applying it to this base worktree. NEVER delete or clean up any worktree or branch unless I explicitly approve cleanup after your verdict.")
	return b.String()
}

func sendPrompt(target, prompt string) {
	if target == "" || prompt == "" {
		return
	}
	cmd := exec.Command("sh", "-c", "sleep 2; tmux send-keys -t \"$1\" -l \"$2\"; tmux send-keys -t \"$1\" Enter", "agenttab-send", target, prompt)
	_ = cmd.Start()
}

func makePatch(sourceDir string) (string, func(), error) {
	dir, err := os.MkdirTemp("", "agenttab-")
	if err != nil {
		return "", func() {}, err
	}
	patch := filepath.Join(dir, "tracked.patch")
	out, err := commandIn(sourceDir, "git", "diff", "--binary", "HEAD").Output()
	if err != nil {
		os.RemoveAll(dir)
		return "", func() {}, err
	}
	if err := os.WriteFile(patch, out, 0o644); err != nil {
		os.RemoveAll(dir)
		return "", func() {}, err
	}
	return patch, func() { os.RemoveAll(dir) }, nil
}

func copyWorktreeContext(sourceDir, targetDir, patchFile string) error {
	if info, err := os.Stat(patchFile); err == nil && info.Size() > 0 {
		if err := commandIn(targetDir, "git", "apply", "--3way", patchFile).Run(); err != nil {
			return err
		}
	}
	if err := copyUntracked(sourceDir, targetDir); err != nil {
		return err
	}
	if err := symlinkContext(sourceDir, targetDir); err != nil {
		return err
	}
	return nil
}

func copyUntracked(sourceDir, targetDir string) error {
	out, err := outputIn(sourceDir, "git", "ls-files", "--others", "--exclude-standard", "-z")
	if err != nil {
		return err
	}
	for _, rel := range strings.Split(out, "\x00") {
		if rel == "" {
			continue
		}
		if err := copyPath(filepath.Join(sourceDir, rel), filepath.Join(targetDir, rel)); err != nil {
			return err
		}
	}
	return nil
}

func copyPath(src, dst string) error {
	info, err := os.Lstat(src)
	if err != nil {
		return err
	}
	if info.Mode()&os.ModeSymlink != 0 {
		link, err := os.Readlink(src)
		if err != nil {
			return err
		}
		if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
			return err
		}
		_ = os.Remove(dst)
		return os.Symlink(link, dst)
	}
	if info.IsDir() {
		return os.MkdirAll(dst, info.Mode().Perm())
	}
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.OpenFile(dst, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, info.Mode().Perm())
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, in)
	return err
}

func symlinkContext(sourceDir, targetDir string) error {
	return filepath.WalkDir(sourceDir, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		name := d.Name()
		if d.IsDir() && name == ".git" {
			return filepath.SkipDir
		}
		rel, err := filepath.Rel(sourceDir, path)
		if err != nil || rel == "." {
			return nil
		}
		if d.IsDir() && name == "node_modules" {
			if err := symlinkIfMissing(path, filepath.Join(targetDir, rel)); err != nil {
				return err
			}
			return filepath.SkipDir
		}
		if !d.IsDir() && strings.HasPrefix(name, ".env") {
			if err := symlinkIfMissing(path, filepath.Join(targetDir, rel)); err != nil {
				return err
			}
		}
		return nil
	})
}

func symlinkIfMissing(src, dst string) error {
	if _, err := os.Lstat(dst); err == nil {
		return nil
	}
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}
	return os.Symlink(src, dst)
}

func requireCommands(cmds []string) error {
	seen := map[string]bool{}
	for _, name := range cmds {
		if seen[name] {
			continue
		}
		seen[name] = true
		if _, err := exec.LookPath(name); err != nil {
			return fmt.Errorf("missing command: %s", name)
		}
	}
	return nil
}

func command(name string, args ...string) *exec.Cmd {
	cmd := exec.Command(name, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin
	return cmd
}

func commandIn(dir, name string, args ...string) *exec.Cmd {
	cmd := command(name, args...)
	cmd.Dir = dir
	return cmd
}

func output(name string, args ...string) (string, error) {
	cmd := exec.Command(name, args...)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	out, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("%s %s: %w: %s", name, strings.Join(args, " "), err, stderr.String())
	}
	return string(out), nil
}

func outputIn(dir, name string, args ...string) (string, error) {
	cmd := exec.Command(name, args...)
	cmd.Dir = dir
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	out, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("%s %s: %w: %s", name, strings.Join(args, " "), err, stderr.String())
	}
	return string(out), nil
}

func shellCmd(cmd string) string {
	return "zsh -lic '" + strings.ReplaceAll(cmd, "'", "'\\''") + "; exec zsh -l'"
}

func findExecutable(name string) string {
	path, err := exec.LookPath(name)
	if err != nil {
		return name
	}
	return path
}

func homeDir() string {
	h, err := os.UserHomeDir()
	if err != nil {
		return os.Getenv("HOME")
	}
	return h
}

func sanitize(s string) string {
	var b strings.Builder
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' || r == '.' || r == '-' {
			b.WriteRune(r)
		} else {
			b.WriteRune('-')
		}
	}
	return b.String()
}
