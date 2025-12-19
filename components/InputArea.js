import { useState } from 'react';

export default function InputArea({ onSend, loading }) {
    const [input, setInput] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;
        onSend(input);
        setInput('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <div style={{
            padding: '20px',
            display: 'flex',
            justifyContent: 'center',
            background: 'linear-gradient(to top, var(--bg-color) 80%, transparent)',
        }}>
            <div style={{
                maxWidth: '800px',
                width: '100%',
                position: 'relative',
                backgroundColor: 'var(--input-bg)',
                borderRadius: '24px',
                border: '1px solid var(--border-color)',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
            }}>
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Message Chat AI..."
                    style={{
                        flex: 1,
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: 'var(--text-main)',
                        outline: 'none',
                        resize: 'none',
                        height: '24px', // base height
                        maxHeight: '200px',
                        fontSize: '1rem',
                        fontFamily: 'inherit',
                    }}
                    rows={1}
                />
                <button
                    onClick={handleSubmit}
                    disabled={!input.trim() || loading}
                    style={{
                        background: 'var(--primary-color)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: '10px',
                        cursor: input.trim() && !loading ? 'pointer' : 'default',
                        opacity: input.trim() && !loading ? 1 : 0.5,
                        transition: 'opacity 0.2s',
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="#131314" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
