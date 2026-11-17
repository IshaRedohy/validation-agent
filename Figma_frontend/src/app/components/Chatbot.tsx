import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hello! I'm your compliance assistant. I can help answer questions about 21 CFR Part 11, risk assessments, data integrity, and GxP requirements. How can I assist you today?",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getBotResponse = (userMessage: string): string => {
    const m = userMessage.toLowerCase();
    if (m.includes('21 cfr part 11') || m.includes('cfr 11'))
      return '21 CFR Part 11 establishes requirements for electronic records and electronic signatures. Key requirements include: secure audit trails, system validation, operational checks, authority checks, and device checks. Would you like details on any specific aspect?';
    if (m.includes('audit trail'))
      return 'Audit trails must be computer-generated, timestamped, and record who performed an action, what was done, when it occurred, and why (if applicable). They must be retained for the same period as the associated records and be available for FDA review.';
    if (m.includes('data integrity') || m.includes('alcoa'))
      return 'Data integrity is based on ALCOA+ principles: Attributable, Legible, Contemporaneous, Original, Accurate, plus Complete, Consistent, Enduring, and Available. These ensure data can be trusted throughout its lifecycle.';
    if (m.includes('access control') || m.includes('password'))
      return 'Access controls should include: unique user IDs, strong password requirements (minimum 8 characters, complexity rules), role-based access control (RBAC), regular access reviews, and multi-factor authentication for critical systems.';
    if (m.includes('validation') || m.includes('qualify'))
      return 'System validation ensures a system consistently performs according to specifications. The process includes: Installation Qualification (IQ), Operational Qualification (OQ), and Performance Qualification (PQ). Validation documentation must be maintained throughout the system lifecycle.';
    if (m.includes('risk assessment') || m.includes('patient safety'))
      return 'Risk assessments should evaluate patient safety, data integrity, and product quality impacts. Use a structured approach: identify hazards, analyze risk probability and severity, evaluate existing controls, and implement mitigation strategies. Document all findings and review regularly.';
    if (m.includes('sop') || m.includes('procedure'))
      return 'SOPs must be: written in clear language, approved by management, version controlled, periodically reviewed, and accessible to trained personnel. All personnel must be trained and training records maintained.';
    if (m.includes('deviation') || m.includes('capa'))
      return 'Deviations must be documented, investigated, and assessed for impact. CAPA (Corrective and Preventive Action) should identify root causes, implement corrections, and prevent recurrence. All actions must be documented with timelines and effectiveness checks.';
    if (m.includes('hello') || m.includes('hi'))
      return "Hello! I'm here to help with compliance questions. You can ask me about 21 CFR Part 11, data integrity, audit trails, validation, risk assessments, or GxP requirements.";
    if (m.includes('thank'))
      return "You're welcome! Feel free to ask if you have more questions about compliance or regulatory requirements.";
    return "I can help with questions about 21 CFR Part 11, data integrity (ALCOA+), audit trails, access controls, system validation, risk assessments, SOPs, and CAPA processes. Could you please rephrase your question or ask about one of these topics?";
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    const userMessage: Message = { id: messages.length + 1, text: inputValue, sender: 'user', timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setTimeout(() => {
      setMessages((prev) => [...prev, { id: prev.length + 1, text: getBotResponse(userMessage.text), sender: 'bot', timestamp: new Date() }]);
      setIsTyping(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="bg-white rounded-2xl shadow-2xl w-80 h-[500px] flex flex-col overflow-hidden" style={{ border: '2px solid #e9d5ff' }}>
          {/* Header */}
          <div className="text-white p-4 flex items-center justify-between flex-shrink-0" style={{ background: 'linear-gradient(135deg, #460073, #A100FF)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: '#ffffff25' }}>
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Compliance Assistant</p>
                <p className="text-xs" style={{ color: '#e0b3ff' }}>Online</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg transition-colors hover:bg-white/20">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ backgroundColor: '#faf5ff' }}>
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[80%] rounded-2xl px-4 py-2 text-sm"
                  style={
                    message.sender === 'user'
                      ? { background: 'linear-gradient(135deg, #7500C0, #A100FF)', color: '#fff', borderBottomRightRadius: 4 }
                      : { backgroundColor: '#fff', color: '#111', borderBottomLeftRadius: 4, boxShadow: '0 1px 4px #0001' }
                  }
                >
                  {message.sender === 'bot' && (
                    <div className="flex items-center gap-1 mb-1">
                      <Bot className="w-3 h-3" style={{ color: '#7500C0' }} />
                      <span className="text-xs" style={{ color: '#7500C0' }}>AI Assistant</span>
                    </div>
                  )}
                  <p>{message.text}</p>
                  <p className="text-xs mt-1" style={{ color: message.sender === 'user' ? '#e0b3ff' : '#aaa' }}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    {[0, 150, 300].map((delay) => (
                      <div key={delay} className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#A100FF', animationDelay: `${delay}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t flex gap-2 flex-shrink-0" style={{ borderColor: '#e9d5ff', backgroundColor: '#fff' }}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about compliance..."
              className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{ border: '2px solid #e9d5ff', color: '#111' }}
              onFocus={(e) => (e.target.style.borderColor = '#A100FF')}
              onBlur={(e) => (e.target.style.borderColor = '#e9d5ff')}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="p-2 rounded-lg text-white transition-opacity disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #7500C0, #A100FF)' }}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="text-white p-4 rounded-full shadow-2xl transition-transform hover:scale-110 relative"
          style={{ background: 'linear-gradient(135deg, #460073, #A100FF)' }}
        >
          <MessageCircle className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full animate-pulse" />
        </button>
      )}
    </div>
  );
}
