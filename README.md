# GitLite

GitLite is a lightweight, Git-inspired version control system built in C++ with a web-based visualization interface.

It replicates key Git internals such as content-addressed storage, commit graphs, and branching, while also providing an interactive UI to explore how version control systems work under the hood.

---

## Features

- Repository initialization and staging mechanism  
- Commit system with content-addressed storage using SHA-1 hashing  
- Branching and checkout with support for creating branches from specific commits  
- Line-level diff engine for file comparison  
- Compare working files with past commits  
- Restore files from any historical commit  
- Inspect stored objects and file contents  
- Full-text search across commit messages using an inverted index  
- Line change statistics between files  
- Commit graph visualization (DAG representation)  
- Garbage collection using mark-and-sweep to remove unused objects  
- Web-based visualization dashboard for diffs, hashes, and internal structures  

---

## System Architecture

GitLite is designed as a modular system:

- C++ core handles repository logic, storage, and algorithms  
- Node.js API layer exposes functionality for external interaction  
- Next.js frontend provides visualization of internal processes  

---

## Project Structure

GitLite/
├── main.cpp  
├── core/           # Repository, Commit, Index  
├── storage/       # Object storage and file management  
├── algorithms/    # SHA-1, Diff engine, Commit graph  
├── features/      # Branching, Search, Stats, Garbage collection  
├── api/           # Node.js REST API  
└── gitlite_ui/    # Next.js frontend  

---

## Build and Run

Ensure you have a C++17-compatible compiler (g++) and Node.js installed.

```bash
# Build the CLI
make

# Run GitLite commands
./gitlite init
./gitlite add file.txt
./gitlite commit "initial commit"

# Start backend and frontend
cd api && node server.cjs & cd ../gitlite_ui && npm install && npm run dev
