// Grammar resource provides the catalog of supported tree-sitter languages.
// Registered via the protocols resource module.

export const GRAMMAR_CATALOG = `panproto supports full-AST parsing for 248 programming languages via tree-sitter grammars.

Top languages by category:

Systems: C, C++, Rust, Go, Zig, D, Nim
Web: TypeScript, JavaScript, HTML, CSS, SCSS, Svelte, Vue
Backend: Python, Ruby, Java, Kotlin, C#, PHP, Perl
Functional: Haskell, OCaml, Elixir, Clojure, Erlang, F#, Lean
Data: SQL, JSON, YAML, TOML, XML, CSV
Schema: Protobuf, GraphQL, Thrift, Avro
Config: Dockerfile, HCL (Terraform), Nix, CMake
Shell: Bash, Zsh, Fish, PowerShell
Mobile: Swift, Dart, Objective-C, Kotlin
Scientific: R, Julia, MATLAB, Fortran, LaTeX
Markup: Markdown, reStructuredText, AsciiDoc, Org

Each grammar auto-derives a GAT theory (sorts from node types, operations from field names).
The generic AstWalker handles all languages; no per-language code needed.
Interstitial text capture enables exact round-trip emission.`;
