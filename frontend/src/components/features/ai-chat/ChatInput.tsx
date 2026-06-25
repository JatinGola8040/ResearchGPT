import { Send } from "lucide-react";
import { useState } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative w-full">
      <textarea 
        className="input w-full min-h-[60px] max-h-[200px] resize-none pr-12 py-3 rounded-xl bg-surface"
        placeholder="Ask a question about your research..."
        rows={1}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
      <button 
        onClick={handleSend}
        disabled={disabled || !input.trim()}
        className="absolute right-2 bottom-2 p-2 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:hover:bg-primary text-background rounded-lg transition-colors shadow-[0_0_10px_rgba(14,165,233,0.3)] hover:shadow-[0_0_15px_rgba(14,165,233,0.5)] disabled:shadow-none"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
}
