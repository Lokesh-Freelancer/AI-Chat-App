import MessageBubble from './MessageBubble';

export default function ChatArea({ messages, loading, scrollRef }) {
    return (
        <div
            ref={scrollRef}
            className="chat-area-container"
            style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto' }}>
                {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                ))}

                {loading && (
                    <div style={{ padding: '0 20px', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '18px' }}>
                            <div className="typing-dots-container" style={{ display: 'flex', gap: '4px' }}>
                                <span className="typing-dot"></span>
                                <span className="typing-dot"></span>
                                <span className="typing-dot"></span>
                            </div>
                            {typeof loading === 'string' && (
                                <span style={{
                                    fontSize: '0.85rem',
                                    color: 'var(--text-secondary)',
                                    animation: 'pulse 1.5s infinite'
                                }}>
                                    {loading}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
