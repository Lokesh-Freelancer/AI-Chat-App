import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { useState } from 'react';

export default function MessageBubble({ message }) {
    const isUser = message.role === 'user';

    const CopyButton = ({ text }) => {
        const [copied, setCopied] = useState(false);

        const handleCopy = () => {
            navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        };

        return (
            <button
                onClick={handleCopy}
                style={{
                    position: 'absolute',
                    top: '5px',
                    right: '5px',
                    backgroundColor: '#2d2e2f',
                    color: '#e3e3e3',
                    border: '1px solid #444746',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    zIndex: 10,
                }}
            >
                {copied ? 'Copied!' : 'Copy Code'}
            </button>
        );
    };

    const CodeBlock = ({ node, inline, className, children, ...props }) => {
        const match = /language-(\w+)/.exec(className || '');
        const codeText = String(children).replace(/\n$/, '');

        return !inline && match ? (
            <div style={{ position: 'relative', margin: '16px 0', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{
                    backgroundColor: '#1e1f20',
                    color: '#a8a8a8',
                    padding: '8px 16px',
                    fontSize: '0.75rem',
                    borderBottom: '1px solid #444746',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span>{match[1]}</span>
                    {/* Header can go here if needed */}
                </div>
                <CopyButton text={codeText} />
                <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{ margin: 0, borderRadius: '0 0 8px 8px' }}
                    {...props}
                >
                    {codeText}
                </SyntaxHighlighter>
            </div>
        ) : (
            <code className={className} style={{ backgroundColor: isUser ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '4px' }} {...props}>
                {children}
            </code>
        );
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: isUser ? 'flex-end' : 'flex-start',
            marginBottom: '24px',
            padding: '0 20px',
            width: '100%',
        }}>
            <div className={`message-content ${isUser ? 'user-msg' : 'ai-msg'}`} style={{
                maxWidth: isUser ? '70%' : '100%', // AI messages can take full width if needed, or keeping restricted
                width: isUser ? 'auto' : '100%',
                maxWidth: '800px', // Limit max width for readability
                padding: '12px 18px',
                borderRadius: '18px',
                backgroundColor: isUser ? 'var(--user-msg-bg)' : 'transparent',
                color: 'var(--text-main)',
                lineHeight: '1.6',
                fontSize: '1rem',
                borderTopRightRadius: isUser ? '4px' : '18px',
                borderTopLeftRadius: isUser ? '18px' : '4px',
                overflowWrap: 'break-word',
            }}>
                {isUser ? (
                    <div>{message.text}</div>
                ) : (
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            code: CodeBlock
                        }}
                    >
                        {message.text}
                    </ReactMarkdown>
                )}
            </div>
        </div>
    );
}
