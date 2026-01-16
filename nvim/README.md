# Neovim Configuration

This README provides an overview of the shortcuts and features in the Neovim configuration.

## Shortcuts and Features

### File Explorer
- `<Ctrl-n>`: Toggle the file explorer (NvimTree)

### Fuzzy Finding (Telescope)
- `<leader>ff`: Quick open files
- `<leader>fg`: Search across file contents
- `<leader>fb`: List and switch between open buffers
- `<leader>fh`: Search help tags

### LSP (Language Server Protocol) Features
- `gd`: Navigate to symbol definition
- `K`: Display hover information
- `<leader>rn`: Rename symbol
- `<leader>ca`: Show available code actions
- `gr`: List all references to the symbol
- `gi`: Navigate to symbol implementation
- `<leader>D`: Navigate to type definition
- `<leader>s`: List document symbols

### Git Integration
- Integrated through Lualine (status line)

### Color Scheme
- Tokyo Night theme

### Code Completion
- Codeium integration for AI-assisted code completion

## Additional Features

- Line numbers enabled
- Mouse support
- Clipboard integration
- Enhanced syntax highlighting (via Treesitter)
- Language-specific indentation settings:
  - Python: 4 spaces
  - Go: Tabs (width 4)
  - Rust: 4 spaces
  - TypeScript/TypeScriptReact: 2 spaces

## Configured Languages

The following languages have specific LSP configurations:

1. Python (pyright)
2. TypeScript (tsserver)
3. Rust (rust-analyzer)
4. Go (gopls)

## Plugins Overview

1. nvim-tree: File explorer
2. lualine: Enhanced status line
3. nvim-lspconfig: Language Server Protocol support
4. telescope: Fuzzy finder and picker
5. codeium: AI code completion

Note: This Neovim configuration offers a keyboard-centric workflow with extensive customization options.
