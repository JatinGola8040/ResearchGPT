import { useState } from "react";
import { MessageSquarePlus, Search, MessageSquare, MoreHorizontal } from "lucide-react";

interface Conversation {
  id: string;
  title: string;
  timestamp: string;
  isActive: boolean;
}

const mockConversations: Conversation[] = [
  { id: '1', title: 'Attention mechanism summary', timestamp: '10m ago', isActive: true },
  { id: '2', title: 'Comparing ResNet and Transformers', timestamp: '2h ago', isActive: false },
  { id: '3', title: 'Literature gaps in NLP', timestamp: 'Yesterday', isActive: false },
  { id: '4', title: 'Explain BLEU score calculation', timestamp: 'Mar 15', isActive: false },
  { id: '5', title: 'Methodology of Generative Adversarial Networks', timestamp: 'Mar 12', isActive: false },
];

export function ChatHistoryPanel() {
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations] = useState(mockConversations);

  const filteredConversations = conversations.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-surface w-full shrink-0">
      <div className="p-4 space-y-4 border-b border-border">
        {/* New Chat Button */}
        <button className="btn btn-primary w-full gap-2 py-3 shadow-[0_0_10px_rgba(14,165,233,0.2)] hover:shadow-[0_0_20px_rgba(14,165,233,0.4)]">
          <MessageSquarePlus className="w-4 h-4" />
          New Chat
        </button>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input 
            type="text" 
            placeholder="Search conversations..." 
            className="input w-full pl-9 py-2 bg-surface-elevated text-sm border-border"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
        {filteredConversations.length === 0 ? (
          <p className="text-center text-sm text-muted mt-4">No conversations found.</p>
        ) : (
          filteredConversations.map((conv) => (
            <div 
              key={conv.id}
              className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all group ${
                conv.isActive 
                  ? 'bg-primary/10 border border-primary/30 text-foreground' 
                  : 'hover:bg-surface-elevated text-muted hover:text-foreground border border-transparent'
              }`}
            >
              <MessageSquare className={`w-4 h-4 shrink-0 mt-0.5 ${conv.isActive ? 'text-primary' : ''}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{conv.title}</p>
                <p className="text-[11px] opacity-70 mt-1">{conv.timestamp}</p>
              </div>
              <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-background rounded transition-all text-muted hover:text-foreground">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
