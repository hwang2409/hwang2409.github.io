---
title: wiki
excerpt: a local markdown vault and agent workspace that keeps my coding work moving
date: 09/04/2026
order: 1
---

Wiki is the place where I keep my notes and run my coding agents. It started as a local Markdown vault. It is now a browser app, a native macOS shell, and an agent supervisor around the same files.

I built it because my workflow kept breaking at the handoffs. A fresh session did not know what an earlier session had learned. A worker could finish while I was looking at another window. A growing set of terminal panes made it hard to know which task was live. I did not need another general project-management tool. I needed a small surface that matched the way I already worked.

![wiki workspace with a rendered note and live agent runs](/projects/wiki-1.png)

## the vault comes first

The data model is plain Markdown in a directory. That choice is more important than it sounds. I can read the files without the app. Agents can edit them. Git provides history. The app adds views, search, links, and live updates without becoming the owner of the content.

The vault has a small amount of structure. An index points agents toward the right topic. A short rolling note carries current context between sessions. A task file tracks work in progress. A completion ledger records merged work. The names are simple, but the contract matters: every agent reads the index before it starts, and it writes durable discoveries at the moments when they happen.

That last part is the real feature. The app does not create memory by itself. The workflow creates memory because writing it down is part of finishing a task.

## from panes to events

The first agent runner used terminal panes as its runtime. The pane was the process, the log, and the user interface. It worked for one or two workers. It became fragile when several workers ran together.

The current supervisor owns the provider processes directly. It receives their streamed events, saves the raw stream, and maps different provider formats into one internal event shape. The browser can then show the same kinds of events for different agents. It can also send a message without pretending that a terminal pane is an API.

This separation gives each layer one job:

- the provider runs the model session;
- the supervisor owns process lifetime and event delivery;
- the app renders sessions and accepts steering;
- the vault keeps the durable human context.

The boundaries make the system easier to replace. The old task recipes still work because the interface above the runtime stayed mostly the same. Only the machinery underneath changed.

## the app is a work surface

Once agents became durable, I needed somewhere to see them. The app grew from a note viewer into a workspace with a pane grid. A pane can hold a note, an agent session, a terminal, a task board, a graph, or a diagnostic view. Layout persists, and the keyboard model borrows from tmux so movement feels familiar.

The editor stays deliberately close to Markdown. It supports links, callouts, tasks, tables, code, math, and diagrams. A task note can become a board, but the board still writes back to the note. That keeps the convenience of a custom view without creating a second copy of the data.

Agent sessions use the same surface whether they appear in a pane or on their own page. A session can show its live transcript, tool activity, status, review state, and related worker information. The app also has views for health, activity, usage, and the graph of linked notes. These are not separate products. They are answers to the questions I kept asking while working.

## what i learned

The durable part of an agent system is not the model process. It is the contract around the process. A kickoff shape, a status shape, a handoff rule, and an independent completion check survive changes in provider and runtime.

I also learned to keep raw evidence. Normalized events are useful for rendering. Raw events are useful when the normalizer is wrong. Keeping both makes debugging possible without trusting the display layer.

The next version may use a different rendering stack and a stronger code editor. The vault, supervisor, and workflow contracts should survive that change. That is the test of the design: the interface can move while the useful habits remain.
