Data Science Studio
====
[![Build Status](https://travis-ci.org/wasdk/WebAssemblyStudio.svg?branch=master)](https://travis-ci.org/wasdk/WebAssemblyStudio) [![Coverage Status](https://coveralls.io/repos/github/wasdk/WebAssemblyStudio/badge.svg)](https://coveralls.io/github/wasdk/WebAssemblyStudio) [![Maintainance Status](https://img.shields.io/badge/maintained-seldom-yellowgreen.svg)](https://github.com/wasdk/WebAssemblyStudio/issues/381)

This repository contains the [WebAssembly Studio](https://webassembly.studio) website source code.

Running your own local copy of the website
===

To run a local copy, you will need to install node.js and webpack on your computer, then run the following commands:

```
npm install
```

To build WebAssembly Studio whenever a file changes run:

```
npm run build-watch
```

To start a dev web server run:

```
npm run dev-server
```

Before submitting a pull request run:

```
npm test
```

### Contributing

Please get familiar with the [contributing guide](https://github.com/wasdk/WebAssemblyStudio/wiki/Contributing).

Any doubts or questions? You can always find us on slack at http://wasm-studio.slack.com

Need a slack invite? https://wasm-studio-invite.herokuapp.com/

### Credits

This project depends on several excellent libraries and tools:

* [Monaco Editor](https://github.com/Microsoft/monaco-editor) is used for rich text editing, tree views and context menus.

* [WebAssembly Binary Toolkit](https://github.com/WebAssembly/wabt) is used to assemble and disassemble `.wasm` files.

* [Binaryen](https://github.com/WebAssembly/binaryen/) is used to validate and optimize `.wasm` files.

* [Clang Format](https://github.com/tbfleming/cib) is used to format C/C++ files.

* [Cassowary.js](https://github.com/slightlyoff/cassowary.js/) is used to make split panes work.

* [Showdown](https://github.com/showdownjs/showdown) is used to automatically preview `.md` files.

* [Capstone.js](https://alexaltea.github.io/capstone.js/) is used to disassemble `x86` code.

* LLVM, Rust, Emscripten running server side.

* And of course: React, WebPack, TypeScript and TSLint.

## Dev scratch pad:

notebook for testing
jupyter notebook --NotebookApp.allow_origin=*

### TODOS

1. separate out the model logic in the JupyterNotebookView
2. add a save method
3. add type detection for .py, .js, .yaml, .yml, .json, .ts, .tsx, .c, .cpp, etc. (maybe find the vscode library for this)
4. add the markdown notebooks
5. add search functionality
6. Implement 
7. Fix up jupyter backend interfaces (decide whether closing a tab should also shut down a notebook)
8. Add a publish option for use with airbnb knowledge repo instances
9. Workflow building tool for use with airflow
10. Allow creating new files, folders and deleting files, folders
11. folders and files can't have the same name -- (is this true of a unix file system as well??)
12. Save state of file tree before/after file and folder addition/deletion
13. Find some way of compiling jupyter to webassembly and run an example in the browser?
14. allow selecting multiple files for deletion
15. fix up right clicking on folders and files to delete them
16. improve selection menu and file/folder renaming ux
17. Handle name collisions for files and folders
18. Put together a demo