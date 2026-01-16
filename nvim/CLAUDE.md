# Neovim Config

Personal Neovim configuration using lazy.nvim.

## Structure

- `init.lua` - Main config file with all plugins and settings
- `lazy-lock.json` - Plugin version lockfile

## Plugins

- **nvim-tree** - File explorer (toggle: `Ctrl+n`)
- **tokyonight** - Color scheme
- **lualine** - Status line
- **nvim-lspconfig** - LSP support (pyright, tsserver, rust-analyzer, gopls)
- **telescope** - Fuzzy finder

## Key Bindings

- `<Space>` - Leader key
- `<C-n>` - Toggle file tree
- `<leader>ff` - Find files
- `<leader>fg` - Live grep
- `<leader>fb` - Buffers
- `gd` - Go to definition
- `K` - Hover docs
- `<leader>rn` - Rename
- `<leader>ca` - Code action

## Adding Plugins

1. Add plugin spec to `require("lazy").setup({...})` in `init.lua`
2. Restart nvim or run `:Lazy sync`
