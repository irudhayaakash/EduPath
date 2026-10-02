import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, MessageSquarePlus, Send, Trash2, UserRound } from "lucide-react";
import { AppShell, EmptyState, SectionTitle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEduPath, useThreads, createThread, deleteThread, saveThread, saveThreadForHistory, getCurrentHistoryId } from "@/lib/edupath-store";
import { buildLearnerContext } from "@/lib/edupath-types";
import { coachResponse } from "@/lib/edupath.functions";
import { useServerFn } from "@tanstack/react-start";

type Message = { id: string; role: "user" | "assistant"; text: string };

export const Route = createFileRoute("/coach")({ component: CoachPage });

function CoachPage() {
  const state = useEduPath();
  const threads = useThreads();
  const askCoach = useServerFn(coachResponse);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const profileKey = state.profile ? JSON.stringify(state.profile) : "";
  const activeRequestThread = useRef<string | null>(null);

  // Only display persisted conversations. Empty drafts are local UI state and are never saved.
  const visibleThreads = useMemo(
    () => threads.filter((thread) => Array.isArray(thread.messages) && thread.messages.length > 0),
    [threads],
  );

  // When the learner/profile changes, select a conversation belonging to that learner.
  // Never carry the previous learner's active thread into the new profile.
  useEffect(() => {
    if (!state.profile) return;
    setError("");
    setLoading(false);
    activeRequestThread.current = null;
    if (visibleThreads.length > 0) {
      const first = visibleThreads[0];
      setActiveThreadId(first.id);
      setMessages((first.messages as Message[]) ?? []);
    } else {
      setActiveThreadId(null);
      setMessages([]);
    }
  }, [profileKey]);

  // Keep the open persisted conversation in sync when Firebase/local state updates it.
  useEffect(() => {
    if (!activeThreadId || activeRequestThread.current === activeThreadId) return;
    const thread = visibleThreads.find((entry) => entry.id === activeThreadId);
    if (thread) setMessages(Array.isArray(thread.messages) ? thread.messages as Message[] : []);
  }, [visibleThreads, activeThreadId]);

  if (!state.profile) {
    return <AppShell><EmptyState title="Your AI coach needs your profile" body="Create your profile first so the coach can personalize its answers." cta={<Button asChild><Link to="/profile">Create profile</Link></Button>} /></AppShell>;
  }

  const startNewConversation = () => {
    activeRequestThread.current = null;
    setActiveThreadId(null);
    setMessages([]);
    setInput("");
    setError("");
    setLoading(false);
  };

  const switchThread = (id: string) => {
    if (loading) return;
    const thread = visibleThreads.find((entry) => entry.id === id);
    if (!thread) return;
    activeRequestThread.current = null;
    setActiveThreadId(id);
    setMessages(Array.isArray(thread.messages) ? thread.messages as Message[] : []);
    setInput("");
    setError("");
  };

  const removeThread = (id: string) => {
    if (loading) return;
    deleteThread(id);
    if (activeThreadId !== id) return;
    const next = visibleThreads.find((thread) => thread.id !== id);
    activeRequestThread.current = null;
    setActiveThreadId(next?.id ?? null);
    setMessages(next ? next.messages as Message[] : []);
    setError("");
  };

  const send = async (text = input) => {
    const clean = text.trim();
    if (!clean || loading) return;

    let threadId = activeThreadId;
    if (!threadId) {
      const thread = createThread(clean.slice(0, 42));
      threadId = thread.id;
      setActiveThreadId(threadId);
    }

    const userMessage: Message = { id: crypto.randomUUID(), role: "user", text: clean };
    const nextMessages: Message[] = [...messages, userMessage];
    const requestThreadId = threadId;
    const requestHistoryId = getCurrentHistoryId();
    const learnerState = state;

    activeRequestThread.current = requestThreadId;
    setInput("");
    setError("");
    setMessages(nextMessages);
    // Persist the user message immediately. The conversation now exists in Firebase/history.
    saveThread(requestThreadId, nextMessages, clean.slice(0, 42));
    setLoading(true);

    try {
      const result = await askCoach({ data: { context: buildLearnerContext(learnerState), message: clean } });
      const completed: Message[] = [...nextMessages, { id: crypto.randomUUID(), role: "assistant", text: result.text }];
      // Only commit the reply if this learner/conversation is still active.
      // Otherwise the response belongs to the previous learner and must never
      // leak into the newly selected profile.
      if (requestHistoryId) {
        if (getCurrentHistoryId() === requestHistoryId) {
          saveThread(requestThreadId, completed, clean.slice(0, 42));
        } else {
          // The user switched learners while Gemini was replying. Store the reply
          // in the original learner's history instead of leaking it into the new one.
          saveThreadForHistory(requestHistoryId, requestThreadId, completed, clean.slice(0, 42));
        }
      }
      if (activeRequestThread.current === requestThreadId && activeThreadId === requestThreadId) setMessages(completed);
    } catch (err) {
      if (activeThreadId === requestThreadId) {
        setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      }
    } finally {
      if (activeRequestThread.current === requestThreadId) {
        activeRequestThread.current = null;
        setLoading(false);
      }
    }
  };

  const currentTitle = visibleThreads.find((thread) => thread.id === activeThreadId)?.title ?? "New conversation";

  return <AppShell>
    <SectionTitle
      title="AI Learning Coach"
      subtitle="Each learner keeps separate conversations. Return to a learner and their complete chats are restored."
      action={<Button variant="outline" onClick={startNewConversation}><MessageSquarePlus className="size-4" /> New conversation</Button>}
    />
    <div className="grid h-[calc(100vh-12rem)] min-h-[480px] max-h-[720px] gap-3 lg:grid-cols-[190px_1fr]">
      <aside className="surface overflow-y-auto p-2.5">
        <div className="flex items-center justify-between px-2 pb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conversations</p>
          <span className="text-[11px] text-muted-foreground">{visibleThreads.length}</span>
        </div>
        <div className="space-y-1">
          {visibleThreads.map((thread) => <div key={thread.id} className={`group flex items-center rounded-lg ${activeThreadId === thread.id ? "bg-secondary" : "hover:bg-secondary/70"}`}>
            <button type="button" onClick={() => switchThread(thread.id)} className="min-w-0 flex-1 px-2 py-2 text-left text-sm">
              <div className="truncate font-medium">{thread.title || "Conversation"}</div>
              <div className="text-[11px] text-muted-foreground">{thread.messages.length} messages</div>
            </button>
            <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100" onClick={() => removeThread(thread.id)} title="Delete conversation"><Trash2 className="size-3.5" /></Button>
          </div>)}
          {visibleThreads.length === 0 && <p className="px-2 py-6 text-center text-xs leading-5 text-muted-foreground">No conversations yet. Send your first message to create one.</p>}
        </div>
      </aside>

      <div className="surface flex min-h-[65vh] flex-col overflow-hidden">
        <div className="border-b border-border bg-background/70 px-5 py-3">
          <p className="text-sm font-semibold">{currentTitle}</p>
          <p className="text-[11px] text-muted-foreground">Saved only for {state.profile.name || "this learner"}</p>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && <div className="mx-auto max-w-xl py-10 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Bot className="size-6" /></span>
            <h3 className="mt-4 text-lg font-semibold">What are you working on?</h3>
            <p className="mt-1 text-sm text-muted-foreground">Try asking: “Explain my biggest skill gap” or “Give me a 30-minute practice task for my current module.”</p>
          </div>}
          {messages.map((message) => <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
              <div className="mb-1 flex items-center gap-1.5 text-xs opacity-70">{message.role === "user" ? <UserRound className="size-3" /> : <Bot className="size-3" />}{message.role === "user" ? "You" : "EduPath"}</div>
              <div className="whitespace-pre-wrap">{message.text}</div>
            </div>
          </div>)}
          {loading ? <div className="text-xs text-muted-foreground">EduPath is thinking…</div> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="flex gap-2 border-t border-border bg-background/70 p-3">
          <Input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask your learning coach…" disabled={loading} />
          <Button type="submit" disabled={!input.trim() || loading}><Send className="size-4" /><span className="hidden sm:inline">Send</span></Button>
        </form>
      </div>
    </div>
  </AppShell>;
}
