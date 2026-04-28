package main

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"syscall"
	"time"

	"gopkg.in/yaml.v3"
)

type AgentDef struct {
	Command string   `yaml:"command"`
	Args    []string `yaml:"args"`
}

type FileConfig struct {
	WorktreesDir string              `yaml:"worktrees_dir"`
	Shell        string              `yaml:"shell"`
	Judge        JudgeConfig         `yaml:"judge"`
	Tmux         TmuxConfig          `yaml:"tmux"`
	Agents       map[string]AgentDef `yaml:"agents"`
}

type JudgeConfig struct {
	Agent string `yaml:"agent"`
}

type TmuxConfig struct {
	Attach     *bool  `yaml:"attach"`
	AttachMode string `yaml:"attach_mode"`
	Layout     string `yaml:"layout"`
}

type cliOptions struct {
	configPath   string
	worktreesDir string
	judge        string
	session      string
	layout       string
	attachMode   string
	attachSet    bool
	attach       bool
	dryRun       bool
	agentsFlag   string
	showConfig   bool
	positionals  []string
	prompt       string
}

type config struct {
	file    FileConfig
	agents  []string
	session string
	prompt  string
	dryRun  bool
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
	opts, err := parseCLI(args)
	if err != nil {
		return err
	}
	if opts.configPath == "" {
		opts.configPath = os.Getenv("AGENTTAB_CONFIG")
	}

	fc := defaultConfig()
	if err := loadConfigFile(&fc, opts.configPath); err != nil {
		return err
	}
	applyEnv(&fc)
	applyFlags(&fc, opts)

	if opts.showConfig {
		enc := yaml.NewEncoder(os.Stdout)
		enc.SetIndent(2)
		defer enc.Close()
		return enc.Encode(fc)
	}

	cfg, err := buildRunConfig(fc, opts)
	if err != nil {
		return err
	}

	commands := []string{"git", "tmux"}
	for _, agent := range cfg.agents {
		def := fc.Agents[agent]
		commands = append(commands, def.Command)
	}
	judgeDef, ok := fc.Agents[fc.Judge.Agent]
	if !ok {
		return fmt.Errorf("judge agent %q is not configured", fc.Judge.Agent)
	}
	commands = append(commands, judgeDef.Command)
	if cfg.dryRun {
		commands = []string{"git"}
	}
	if err := requireCommands(commands); err != nil {
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

	wtBase, err := expandPath(fc.WorktreesDir)
	if err != nil {
		return err
	}
	if cfg.dryRun {
		fmt.Printf("worktrees_dir: %s\n", wtBase)
		fmt.Printf("judge: %s (%s)\n", fc.Judge.Agent, commandLine(judgeDef))
		fmt.Printf("attach_mode: %s\n", fc.Tmux.AttachMode)
		fmt.Printf("layout: %s\n", fc.Tmux.Layout)
		fmt.Println("candidates:")
		for _, agent := range cfg.agents {
			path := filepath.Join(wtBase, fmt.Sprintf("%s-%s-agenttab-%s-%s", repoName, safeRef, agent, stamp))
			branch := fmt.Sprintf("agenttab/%s/%s-%s", safeRef, agent, stamp)
			fmt.Printf("  - %s: %s (%s) command=%s\n", agent, path, branch, commandLine(fc.Agents[agent]))
		}
		return nil
	}
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
			cmd:    commandLine(fc.Agents[agent]),
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

func defaultConfig() FileConfig {
	shell := os.Getenv("SHELL")
	if shell == "" {
		shell = "/bin/sh"
	}
	return FileConfig{
		WorktreesDir: "~/.agenttab/worktrees",
		Shell:        shell,
		Judge:        JudgeConfig{Agent: "pi"},
		Tmux: TmuxConfig{
			Attach:     boolPtr(true),
			AttachMode: "normal",
			Layout:     "tiled",
		},
		Agents: map[string]AgentDef{
			"codex":  {Command: "codex", Args: []string{"--yolo"}},
			"claude": {Command: "claude", Args: []string{"--yolo"}},
			"pi":     {Command: "pi"},
		},
	}
}

func boolPtr(v bool) *bool { return &v }

func attachEnabled(fc FileConfig) bool {
	if fc.Tmux.Attach == nil {
		return true
	}
	return *fc.Tmux.Attach
}

func loadConfigFile(fc *FileConfig, path string) error {
	if path == "" {
		path = defaultConfigPath()
	}
	expanded, err := expandPath(path)
	if err != nil {
		return err
	}
	data, err := os.ReadFile(expanded)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	var override FileConfig
	if err := yaml.Unmarshal(data, &override); err != nil {
		return fmt.Errorf("read config %s: %w", expanded, err)
	}
	mergeConfig(fc, override)
	return nil
}

func mergeConfig(dst *FileConfig, src FileConfig) {
	if src.WorktreesDir != "" {
		dst.WorktreesDir = src.WorktreesDir
	}
	if src.Shell != "" {
		dst.Shell = src.Shell
	}
	if src.Judge.Agent != "" {
		dst.Judge.Agent = src.Judge.Agent
	}
	if src.Tmux.AttachMode != "" {
		dst.Tmux.AttachMode = src.Tmux.AttachMode
	}
	if src.Tmux.Layout != "" {
		dst.Tmux.Layout = src.Tmux.Layout
	}
	if src.Tmux.Attach != nil {
		dst.Tmux.Attach = src.Tmux.Attach
	}
	if src.Agents != nil {
		if dst.Agents == nil {
			dst.Agents = map[string]AgentDef{}
		}
		for name, def := range src.Agents {
			dst.Agents[name] = def
		}
	}
}

func applyEnv(fc *FileConfig) {
	if v := os.Getenv("AGENTTAB_WORKTREES_DIR"); v != "" {
		fc.WorktreesDir = v
	}
	if v := os.Getenv("AGENTTAB_ATTACH_MODE"); v != "" {
		fc.Tmux.AttachMode = v
	}
	if v := os.Getenv("AGENTTAB_JUDGE"); v != "" {
		fc.Judge.Agent = v
	}
	if v := os.Getenv("AGENTTAB_LAYOUT"); v != "" {
		fc.Tmux.Layout = v
	}
}

func applyFlags(fc *FileConfig, opts cliOptions) {
	if opts.worktreesDir != "" {
		fc.WorktreesDir = opts.worktreesDir
	}
	if opts.judge != "" {
		fc.Judge.Agent = opts.judge
	}
	if opts.layout != "" {
		fc.Tmux.Layout = opts.layout
	}
	if opts.attachMode != "" {
		fc.Tmux.AttachMode = opts.attachMode
	}
	if opts.attachSet {
		fc.Tmux.Attach = boolPtr(opts.attach)
		if !opts.attach {
			fc.Tmux.AttachMode = "none"
		}
	}
	if fc.Tmux.AttachMode == "none" {
		fc.Tmux.Attach = boolPtr(false)
	}
}

func parseCLI(args []string) (cliOptions, error) {
	opts := cliOptions{attach: true}
	for i := 0; i < len(args); i++ {
		arg := args[i]
		if arg == "--" {
			opts.prompt = strings.Join(args[i+1:], " ")
			break
		}
		if arg == "--help" || arg == "-h" {
			usage()
			os.Exit(0)
		}
		if !strings.HasPrefix(arg, "--") {
			opts.positionals = append(opts.positionals, arg)
			continue
		}
		name, value, hasValue := strings.Cut(strings.TrimPrefix(arg, "--"), "=")
		takeValue := func() (string, error) {
			if hasValue {
				return value, nil
			}
			if i+1 >= len(args) {
				return "", fmt.Errorf("--%s requires a value", name)
			}
			i++
			return args[i], nil
		}
		switch name {
		case "config":
			v, err := takeValue()
			if err != nil {
				return opts, err
			}
			opts.configPath = v
		case "worktrees-dir":
			v, err := takeValue()
			if err != nil {
				return opts, err
			}
			opts.worktreesDir = v
		case "judge":
			v, err := takeValue()
			if err != nil {
				return opts, err
			}
			opts.judge = v
		case "session":
			v, err := takeValue()
			if err != nil {
				return opts, err
			}
			opts.session = v
		case "layout":
			v, err := takeValue()
			if err != nil {
				return opts, err
			}
			opts.layout = v
		case "attach-mode":
			v, err := takeValue()
			if err != nil {
				return opts, err
			}
			opts.attachMode = v
		case "agents":
			v, err := takeValue()
			if err != nil {
				return opts, err
			}
			opts.agentsFlag = v
		case "attach":
			opts.attachSet = true
			opts.attach = true
		case "no-attach":
			opts.attachSet = true
			opts.attach = false
		case "dry-run":
			opts.dryRun = true
		case "show-config":
			opts.showConfig = true
		default:
			return opts, fmt.Errorf("unknown option: --%s", name)
		}
	}
	return opts, nil
}

func buildRunConfig(fc FileConfig, opts cliOptions) (config, error) {
	cfg := config{file: fc, prompt: opts.prompt, session: opts.session, dryRun: opts.dryRun}
	if cfg.session == "" {
		cfg.session = sessionFromPositionals(opts.positionals)
	}
	if opts.agentsFlag != "" {
		for _, a := range strings.Split(opts.agentsFlag, ",") {
			if strings.TrimSpace(a) != "" {
				cfg.agents = append(cfg.agents, strings.TrimSpace(a))
			}
		}
	} else if len(opts.positionals) > 0 && opts.positionals[0] == "all" {
		cfg.agents = configuredAgentNames(fc)
		if len(opts.positionals) > 2 {
			return cfg, errors.New("usage: agenttab all [session_name] [-- prompt]")
		}
		if len(opts.positionals) == 2 {
			cfg.session = opts.positionals[1]
		}
	} else {
		for _, arg := range opts.positionals {
			if _, ok := fc.Agents[arg]; ok {
				if cfg.session != "" && cfg.session != opts.session {
					return cfg, errors.New("agent names must come before session_name")
				}
				cfg.agents = append(cfg.agents, arg)
			} else if cfg.session == "" {
				cfg.session = arg
			} else if cfg.session != arg {
				return cfg, fmt.Errorf("unexpected argument: %s", arg)
			}
		}
	}
	if len(cfg.agents) == 0 {
		cfg.agents = []string{"codex", "pi"}
	}
	if len(cfg.agents) < 2 || len(cfg.agents) > 3 {
		return cfg, errors.New("pick two or three agents, or use: agenttab all")
	}
	seen := map[string]bool{}
	for _, agent := range cfg.agents {
		if seen[agent] {
			return cfg, errors.New("pick different agents")
		}
		seen[agent] = true
		def, ok := fc.Agents[agent]
		if !ok || def.Command == "" {
			return cfg, fmt.Errorf("agent %q is not configured", agent)
		}
	}
	if _, ok := fc.Agents[fc.Judge.Agent]; !ok {
		return cfg, fmt.Errorf("judge agent %q is not configured", fc.Judge.Agent)
	}
	if fc.Tmux.Layout == "" {
		return cfg, errors.New("tmux.layout cannot be empty")
	}
	if fc.Tmux.AttachMode != "normal" && fc.Tmux.AttachMode != "iterm-control-mode" && fc.Tmux.AttachMode != "none" {
		return cfg, errors.New("tmux.attach_mode must be normal, iterm-control-mode, or none")
	}
	return cfg, nil
}

func sessionFromPositionals(pos []string) string { return "" }

func configuredAgentNames(fc FileConfig) []string {
	names := make([]string, 0, len(fc.Agents))
	preferred := []string{"codex", "claude", "pi"}
	seen := map[string]bool{}
	for _, p := range preferred {
		if _, ok := fc.Agents[p]; ok {
			names = append(names, p)
			seen[p] = true
		}
	}
	other := []string{}
	for name := range fc.Agents {
		if !seen[name] {
			other = append(other, name)
		}
	}
	sort.Strings(other)
	names = append(names, other...)
	if len(names) > 3 {
		return names[:3]
	}
	return names
}

func usage() {
	fmt.Println("Usage: agenttab [flags] [all|agent...] [session_name] [-- prompt]")
	fmt.Println("Flags:")
	fmt.Println("  --config PATH")
	fmt.Println("  --worktrees-dir PATH")
	fmt.Println("  --judge AGENT")
	fmt.Println("  --session NAME")
	fmt.Println("  --agents a,b[,c]")
	fmt.Println("  --layout tiled|even-horizontal|even-vertical")
	fmt.Println("  --attach-mode normal|iterm-control-mode|none")
	fmt.Println("  --attach / --no-attach")
	fmt.Println("  --dry-run")
	fmt.Println("  --show-config")
	fmt.Println("Examples:")
	fmt.Println("  agenttab")
	fmt.Println("  agenttab codex claude -- 'implement X'")
	fmt.Println("  agenttab all -- 'implement X'")
}

func openInsideTmux(sourceDir string, cfg config, candidates []candidate, judgePrompt string) error {
	session, err := output("tmux", "display-message", "-p", "#S")
	if err != nil {
		return err
	}
	session = strings.TrimSpace(session)
	currentPane, _ := output("tmux", "display-message", "-p", "#{pane_id}")
	currentPane = strings.TrimSpace(currentPane)

	firstPane, err := output("tmux", "new-window", "-P", "-F", "#{pane_id}", "-t", session+":", "-n", "ab-test", "-c", candidates[0].path, shellCmd(cfg.file, candidates[0].cmd))
	if err != nil {
		return err
	}
	candidates[0].pane = strings.TrimSpace(firstPane)
	windowIndex, _ := output("tmux", "display-message", "-p", "-t", candidates[0].pane, "#I")
	windowTarget := session + ":" + strings.TrimSpace(windowIndex)

	secondPane, err := output("tmux", "split-window", "-P", "-F", "#{pane_id}", "-h", "-t", windowTarget, "-c", candidates[1].path, shellCmd(cfg.file, candidates[1].cmd))
	if err != nil {
		return err
	}
	candidates[1].pane = strings.TrimSpace(secondPane)
	if len(candidates) == 3 {
		thirdPane, err := output("tmux", "split-window", "-P", "-F", "#{pane_id}", "-v", "-t", candidates[1].pane, "-c", candidates[2].path, shellCmd(cfg.file, candidates[2].cmd))
		if err != nil {
			return err
		}
		candidates[2].pane = strings.TrimSpace(thirdPane)
	}
	_ = command("tmux", "select-layout", "-t", windowTarget, cfg.file.Tmux.Layout).Run()
	for _, cand := range candidates {
		sendPrompt(cand.pane, cfg.prompt)
	}
	sendPrompt(currentPane, judgePrompt)
	fmt.Printf("Opened %s contestants. Starting %s judge here.\n", strings.Join(cfg.agents, ", "), cfg.file.Judge.Agent)
	judgeCmd := commandLine(cfg.file.Agents[cfg.file.Judge.Agent])
	return syscall.Exec(findExecutable(cfg.file.Shell), []string{cfg.file.Shell, "-lc", judgeCmd}, os.Environ())
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
	judgeCmd := commandLine(cfg.file.Agents[cfg.file.Judge.Agent])
	if err := command("tmux", "new-session", "-d", "-s", session, "-n", "judge", "-c", sourceDir, shellCmd(cfg.file, judgeCmd)).Run(); err != nil {
		return err
	}
	judgePane, _ := output("tmux", "list-panes", "-t", session+":", "-F", "#{pane_id}")
	judgePane = strings.TrimSpace(strings.Split(judgePane, "\n")[0])
	judgeWindow, _ := output("tmux", "display-message", "-p", "-t", judgePane, "#I")
	judgeWindow = strings.TrimSpace(judgeWindow)

	firstPane, err := output("tmux", "new-window", "-P", "-F", "#{pane_id}", "-t", session+":", "-n", "ab-test", "-c", candidates[0].path, shellCmd(cfg.file, candidates[0].cmd))
	if err != nil {
		return err
	}
	candidates[0].pane = strings.TrimSpace(firstPane)
	windowIndex, _ := output("tmux", "display-message", "-p", "-t", candidates[0].pane, "#I")
	windowTarget := session + ":" + strings.TrimSpace(windowIndex)

	secondPane, err := output("tmux", "split-window", "-P", "-F", "#{pane_id}", "-h", "-t", windowTarget, "-c", candidates[1].path, shellCmd(cfg.file, candidates[1].cmd))
	if err != nil {
		return err
	}
	candidates[1].pane = strings.TrimSpace(secondPane)
	if len(candidates) == 3 {
		thirdPane, err := output("tmux", "split-window", "-P", "-F", "#{pane_id}", "-v", "-t", candidates[1].pane, "-c", candidates[2].path, shellCmd(cfg.file, candidates[2].cmd))
		if err != nil {
			return err
		}
		candidates[2].pane = strings.TrimSpace(thirdPane)
	}
	_ = command("tmux", "select-layout", "-t", windowTarget, cfg.file.Tmux.Layout).Run()
	for _, cand := range candidates {
		sendPrompt(cand.pane, cfg.prompt)
	}
	sendPrompt(judgePane, judgePrompt)
	_ = command("tmux", "select-window", "-t", session+":"+judgeWindow).Run()
	if !attachEnabled(cfg.file) || cfg.file.Tmux.AttachMode == "none" {
		fmt.Printf("Created detached tmux session: %s\n", session)
		return nil
	}
	if cfg.file.Tmux.AttachMode == "iterm-control-mode" {
		return command("tmux", "-CC", "attach", "-t", session).Run()
	}
	return command("tmux", "attach", "-t", session).Run()
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

func commandLine(def AgentDef) string {
	parts := []string{shellQuote(def.Command)}
	for _, arg := range def.Args {
		parts = append(parts, shellQuote(arg))
	}
	return strings.Join(parts, " ")
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
		if seen[name] || name == "" {
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

func shellCmd(fc FileConfig, cmd string) string {
	return fc.Shell + " -lc " + shellQuote(cmd+"; exec "+fc.Shell+" -l")
}

func shellQuote(s string) string {
	if s == "" {
		return "''"
	}
	return "'" + strings.ReplaceAll(s, "'", "'\\''") + "'"
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

func defaultConfigPath() string {
	if xdg := os.Getenv("XDG_CONFIG_HOME"); xdg != "" {
		return filepath.Join(xdg, "agenttab", "config.yaml")
	}
	return filepath.Join(homeDir(), ".config", "agenttab", "config.yaml")
}

func expandPath(path string) (string, error) {
	if path == "" {
		return "", nil
	}
	if path == "~" {
		return homeDir(), nil
	}
	if strings.HasPrefix(path, "~/") {
		return filepath.Join(homeDir(), strings.TrimPrefix(path, "~/")), nil
	}
	return filepath.Abs(path)
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
