import { Loader2, MessageSquare, Send, Trash2 } from "lucide-react";
import type { ChatMessage } from "../types";

interface DocumentChatProps {
  messages: ChatMessage[];
  question: string;
  status: string;
  canChat: boolean;
  isChatting: boolean;
  onQuestionChange: (question: string) => void;
  onAsk: () => void;
  onClear: () => void;
}

export function DocumentChat({
  messages,
  question,
  status,
  canChat,
  isChatting,
  onQuestionChange,
  onAsk,
  onClear,
}: DocumentChatProps) {
  const canSubmit = canChat && question.trim().length > 0 && !isChatting;

  return (
    <section className="panel chat-panel">
      <div className="panel-heading">
        <div className="heading-with-icon">
          <MessageSquare size={18} aria-hidden="true" />
          <h2>Document Chat</h2>
        </div>
        <div className="status-pill">
          {isChatting && <Loader2 className="spin" size={15} aria-hidden="true" />}
          <span>{status}</span>
        </div>
      </div>

      <div className="chat-thread" aria-live="polite">
        {messages.length ? (
          messages.map((message) => (
            <article
              className={`chat-message ${message.role}`}
              key={message.id}
            >
              <span>{message.role === "user" ? "You" : "Assistant"}</span>
              <p>
                {message.content}
                {isChatting &&
                  message.role === "assistant" &&
                  message.id === messages[messages.length - 1]?.id && (
                    <span className="cursor" aria-hidden="true" />
                  )}
              </p>
            </article>
          ))
        ) : (
          <span className="empty-state">Ask about the current document.</span>
        )}
      </div>

      <form
        className="chat-form"
        onSubmit={(event) => {
          event.preventDefault();
          onAsk();
        }}
      >
        <input
          value={question}
          disabled={!canChat || isChatting}
          onChange={(event) => onQuestionChange(event.target.value)}
          placeholder="Ask a question about this document"
        />
        <button
          className="button primary"
          type="submit"
          disabled={!canSubmit}
        >
          <Send size={17} aria-hidden="true" />
          Ask
        </button>
        <button
          className="icon-button"
          type="button"
          disabled={!messages.length || isChatting}
          title="Clear chat"
          aria-label="Clear chat"
          onClick={onClear}
        >
          <Trash2 size={17} aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}
