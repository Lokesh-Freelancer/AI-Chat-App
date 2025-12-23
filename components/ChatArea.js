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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingLeft: '18px' }}>
                            <span className="typing-dot"></span>
                            <span className="typing-dot"></span>
                            <span className="typing-dot"></span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
