---
title: zeta
excerpt: a standalone agent harness that owns the loop instead of hiding it in a provider
date: 09/04/2026
order: 2
---

Zeta is a custom agent harness. It owns the agent loop from the first user message to the final tool result. The project is standalone and separate from Wiki. Wiki may consume it later, but zeta does not depend on the Wiki app.

I started it after seeing how much behavior lived inside provider clients. A provider process could own the conversation, choose the context, run tools, decide when to compact, and manage resume. That makes a quick demo easy. It makes the harness hard to reason about. I wanted the durable state and the policy decisions to belong to one small system.

![zeta terminal harness with transcript and composer](/projects/zeta-1.png)
<!-- screenshot supplied by orchestrator -->

## one completion at a time

Zeta treats a provider as a completion backend. The harness sends one bounded completion, receives a stream, and stops at the tool boundary. If the model asks for a tool, zeta validates and runs it. The next completion sees the recorded result.

That boundary makes the loop explicit. The harness can apply the same tool registry and approval policy to both supported providers. It can also record the same event categories: assistant text, thinking summaries, tool calls, tool results, usage, and failures. The provider wire format stays behind its adapter.

The loop owns turns, follow-up messages, steering, stop conditions, aborts, and retry behavior. It does not need to guess what happened by reading a provider transcript after the fact.

## the conversation is an append-only record

Sessions use an append-only JSONL conversation store. Entries have parents, so a session can represent branches instead of flattening every message into one list. Resume replays the record and rebuilds the active branch.

The store also handles the unglamorous cases. It repairs a torn final line after an interrupted write. It records compaction markers. It keeps tool calls paired with tool results. It preserves pending approvals so a restart does not turn a question into a silent failure.

Context is derived from the active branch, not from provider history. A context assembler applies the context budget and retained tail. A compaction policy creates a summary without tools and refuses to continue if that summary fails. It also never compacts between a tool call and its result. These rules keep the model context understandable and the session recoverable.

## tools are a policy boundary

The tool registry is shared across providers. It validates schemas, handles aborts, supports sequential or parallel execution, and runs a pre-execution hook. The approval policy decides whether a tool is allowed, denied, or needs a user decision.

This is more than a safety feature. It keeps the model from becoming the hidden owner of application state. The harness knows when a tool started, whether it completed, and what result entered the conversation. A later renderer can show a compact receipt without inventing one from prose.

The same idea applies to sub-agents. A child gets its own conversation store and a bounded turn budget. Its result returns as a tool result to the parent. The parent can inspect the child without losing the parent session's history.

## a terminal interface with state

Zeta has a full-screen terminal interface with a scrollable transcript, a sticky composer, and a pinned footer. Streaming text can render as it arrives. Completed messages can receive richer Markdown rendering. Tool calls, approvals, status, and errors have their own compact forms.

The composer supports local file references and pasted images. Slash commands can act before a prompt reaches the model. Custom commands can expand into prompt templates or run deterministic shell macros with the same approval policy as the regular execution tool.

The interface is a view over the harness state. It is not the source of truth. That distinction lets resume rebuild the transcript, keeps drafts safe across failures, and makes the plain path useful for tests.

## what i learned

Owning the loop makes small rules visible. One completion per provider call is easier to test than a hidden loop. An append-only conversation is easier to resume than a provider-owned session. A shared registry is easier to audit than one tool path per provider.

The cost is that zeta must implement the boring parts itself: compaction, retries, approvals, session replay, and failure messages. That cost is the point. Those behaviors decide whether an agent feels reliable during a long task.

I am not trying to build a universal agent platform. Zeta is a focused experiment in making the harness legible. If a feature cannot explain who owns its state, when it persists, and how it resumes, it probably does not belong in the core yet.
