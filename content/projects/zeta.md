---
title: zeta
excerpt: a standalone agent harness that owns the loop instead of hiding it in a provider
date: 09/04/2026
order: 2
---

Zeta began with a simple question: what should still be true when an agent
stops halfway through a task? The answer is a harness that owns its loop,
records each boundary, and can rebuild the session later. It is standalone
and separate from Wiki. Wiki may consume it later, but zeta does not depend on
the Wiki app.

The project started after I saw how much behavior lived inside provider
clients. A provider could own the conversation, choose the context, run tools,
decide when to compact, and manage resume. That makes a quick demo easy. It
makes the harness hard to reason about. I wanted durable state and policy to
belong to one small system.

## the hard boundary

Zeta treats a provider as a completion backend. The harness sends one bounded completion, receives a stream, and stops at the tool boundary. If the model asks for a tool, zeta validates and runs it. The next completion sees the recorded result.

![zeta terminal harness with transcript and composer](/projects/zeta-1.png)

That boundary makes the loop explicit. The harness applies one tool registry
and approval policy to both supported providers. It records assistant text,
thinking summaries, tool calls, tool results, usage, and failures. The
provider wire format stays behind its adapter.

The loop owns turns, follow-up messages, steering, stop conditions, aborts, and retry behavior. It does not need to guess what happened by reading a provider transcript after the fact.

## recovery is a data problem

Sessions use an append-only JSONL conversation store. Entries have parents, so a session can represent branches instead of flattening every message into one list. Resume replays the record and rebuilds the active branch.

One useful edge case is a torn final line. After an interrupted write, the
store repairs that last line before replay. It also records compaction markers,
keeps tool calls paired with results, and preserves pending approvals. A
restart should not turn a question into a silent failure.

Context is derived from the active branch, not from provider history. A context assembler applies the context budget and retained tail. A compaction policy creates a summary without tools and refuses to continue if that summary fails. It also never compacts between a tool call and its result. These rules keep the model context understandable and the session recoverable.

## policy stays visible

The tool registry is shared across providers. It validates schemas, handles aborts, supports sequential or parallel execution, and runs a pre-execution hook. The approval policy decides whether a tool is allowed, denied, or needs a user decision.

This is more than a safety feature. It keeps the model from becoming the hidden owner of application state. The harness knows when a tool started, whether it completed, and what result entered the conversation. A later renderer can show a compact receipt without inventing one from prose.

The same idea applies to sub-agents. A child gets its own conversation store and a bounded turn budget. Its result returns as a tool result to the parent. The parent can inspect the child without losing the parent session's history.

## the terminal is a view

Zeta has a full-screen terminal interface with a scrollable transcript, a sticky composer, and a pinned footer. Streaming text can render as it arrives. Completed messages can receive richer Markdown rendering. Tool calls, approvals, status, and errors have their own compact forms.

The composer supports file references and pasted images. Slash commands can act
before a prompt reaches the model. Custom commands can expand into prompt
templates or run deterministic shell macros with the same approval policy as
the regular execution tool.

The interface is a view over the harness state. It is not the source of truth. That distinction lets resume rebuild the transcript, keeps drafts safe across failures, and makes the plain path useful for tests.

## what comes next

Owning the loop makes small rules visible. One completion per provider call is
easier to test than a hidden loop. An append-only conversation is easier to
resume than a provider-owned session. A shared registry is easier to audit
than one tool path per provider.

The cost is that zeta must implement compaction, retries, approvals, replay,
and failure messages itself. That cost is the point. Those behaviors decide
whether an agent stays reliable during a long task.

The next useful step is to make those ownership rules easier to inspect during
development. Zeta is not trying to become a universal agent platform. It is a
focused experiment in making the harness legible.
