import React, { useState } from 'react';
import { fetchGeminiResponse } from '../service/gemini';

export default function SimpleChatbot() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const sendMessage = async () => {
        if (!input.trim()) return;
        const userMsg = { role: 'user', text: input };
        setMessages((msgs) => [...msgs, userMsg]);
        setInput('');
        setLoading(true);
        try {
            const reply = await fetchGeminiResponse(userMsg.text);
            setMessages((msgs) => [...msgs, { role: 'bot', text: reply }]);
        } catch (e) {
            setMessages((msgs) => [...msgs, { role: 'bot', text: 'Error: ' + e.message }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !loading) sendMessage();
    };

    return (
        <div style={{ border: '1px solid #ccc', padding: 16, maxWidth: 400 }}>
            <div style={{ minHeight: 120, marginBottom: 8 }}>
                {messages.map((msg, i) => (
                    <div key={i} style={{ textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                        <b>{msg.role === 'user' ? 'You' : 'Gemini'}:</b> {msg.text}
                    </div>
                ))}
            </div>
            <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                style={{ width: '70%' }}
                placeholder="Type a message..."
            />
            <button onClick={sendMessage} disabled={loading || !input.trim()} style={{ width: '28%', marginLeft: 4 }}>
                {loading ? '...' : 'Send'}
            </button>
        </div>
    );
}
