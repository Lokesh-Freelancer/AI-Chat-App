import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { useState, useEffect, useRef } from 'react';

import { franc } from 'franc-min';

export default function MessageBubble({ message, isLast, loading }) {
    const isUser = message.role === 'user';
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const utteranceRef = useRef(null);

    // Check if Speech Synthesis is supported
    useEffect(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            setIsSupported(true);
        }
        // Cleanup on unmount
        return () => {
            shouldSpeakRef.current = false;
            window.speechSynthesis.cancel();
        };
    }, []);

    // Ref to control recursive chunk speaking
    const shouldSpeakRef = useRef(false);

    const speakMessage = () => {
        try {
            if (!isSupported) {
                console.warn('Speech synthesis not supported');
                alert('Text-to-speech is not supported in your browser.');
                return;
            }

            // Stop if already speaking
            if (isSpeaking) {
                console.log('Stopping speech');
                shouldSpeakRef.current = false; // Signal to stop recursion
                window.speechSynthesis.cancel();
                setIsSpeaking(false);
                return;
            }

            // Clean text for speech
            const textToSpeak = message.text
                .replace(/```[\s\S]*?```/g, '') // Remove code blocks
                .replace(/`[^`]+`/g, '') // Remove inline code
                .replace(/[#*_~]/g, '') // Remove markdown symbols
                .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Convert links to text
                .trim();

            if (!textToSpeak) {
                console.warn('No text to speak');
                alert('No text to speak.');
                return;
            }

            console.log('Preparing to speak (chunked)...');

            // Language detection (do once for consistency)
            let langCode = 'und';
            try {
                langCode = franc(textToSpeak, { minLength: 3 });
                console.log('Detected language code:', langCode);
            } catch (err) {
                console.error('Language detection failed:', err);
                langCode = 'eng';
            }

            const LANGUAGE_MAP = {
                // Indian Languages
                'hin': 'hi-IN', // Hindi
                'ben': 'bn-IN', // Bengali
                'guj': 'gu-IN', // Gujarati
                'mar': 'mr-IN', // Marathi
                'tam': 'ta-IN', // Tamil
                'tel': 'te-IN', // Telugu
                'kan': 'kn-IN', // Kannada
                'mal': 'ml-IN', // Malayalam
                'pan': 'pa-IN', // Punjabi
                'urd': 'ur-IN', // Urdu

                // Asian Languages
                'cmn': 'zh-CN', // Mandarin Chinese
                'zho': 'zh-CN', // Chinese
                'jpn': 'ja-JP', // Japanese
                'kor': 'ko-KR', // Korean
                'ind': 'id-ID', // Indonesian
                'tha': 'th-TH', // Thai
                'vie': 'vi-VN', // Vietnamese

                // European Languages
                'eng': 'en-US', // English
                'spa': 'es-ES', // Spanish
                'fra': 'fr-FR', // French
                'deu': 'de-DE', // German
                'ita': 'it-IT', // Italian
                'por': 'pt-PT', // Portuguese
                'rus': 'ru-RU', // Russian
                'nld': 'nl-NL', // Dutch
                'pol': 'pl-PL', // Polish
                'tur': 'tr-TR', // Turkish
                'swe': 'sv-SE', // Swedish
                'dan': 'da-DK', // Danish
                'fin': 'fi-FI', // Finnish
                'nor': 'nb-NO', // Norwegian
                'ell': 'el-GR', // Greek
                'hun': 'hu-HU', // Hungarian
                'ces': 'cs-CZ', // Czech
                'ukr': 'uk-UA', // Ukrainian

                // Middle Eastern / African
                'arb': 'ar-SA', // Arabic
                'heb': 'he-IL', // Hebrew
                'fas': 'fa-IR', // Persian
                'swh': 'sw-KE', // Swahili
            };

            const targetLang = LANGUAGE_MAP[langCode] || 'en-US';

            // Voice selection
            const voices = window.speechSynthesis.getVoices();
            let selectedVoice = null;
            if (voices.length > 0) {
                selectedVoice = voices.find(v => v.lang === targetLang) || voices.find(v => v.lang.startsWith(targetLang.split('-')[0]));
            }

            // Chunking Logic
            // Split by punctuation: . ? ! : ; newline, Hindi Danda (।), and CJK punctuation (。？！，；：)
            // We use a regex with capturing group to keep delimiters
            const splitRegex = /([.?!:;\n\u0964\u3002\uFF1F\uFF01\uFF0C\uFF1B\uFF1A])/;
            const rawSegments = textToSpeak.split(splitRegex);

            // Recombine segments into chunks of reasonable size
            const chunks = [];
            let currentChunk = '';

            for (let i = 0; i < rawSegments.length; i++) {
                const segment = rawSegments[i];

                // If segment is just a delimiter, append to current chunk and push
                if (splitRegex.test(segment)) {
                    currentChunk += segment;
                    // Use a soft limit to avoid cutting sentences (e.g. "Mr." or "e.g.")
                    // But generally, a delimiter usually ends a chunk if it's long enough
                    if (currentChunk.trim().length > 0) {
                        chunks.push(currentChunk.trim());
                        currentChunk = '';
                    }
                } else {
                    // It's text. Check if adding it exceeds limit
                    if (currentChunk.length + segment.length > 200) {
                        // If current chunk is not empty, push it first
                        if (currentChunk.trim().length > 0) {
                            chunks.push(currentChunk.trim());
                            currentChunk = '';
                        }
                    }
                    currentChunk += segment;
                }
            }
            // Push remaining
            if (currentChunk.trim().length > 0) {
                chunks.push(currentChunk.trim());
            }

            console.log('Generated chunks:', chunks);

            shouldSpeakRef.current = true;
            setIsSpeaking(true);

            let currentChunkIndex = 0;

            const speakNextChunk = () => {
                if (!shouldSpeakRef.current) return;

                if (currentChunkIndex >= chunks.length) {
                    setIsSpeaking(false);
                    shouldSpeakRef.current = false;
                    return;
                }

                const chunkText = chunks[currentChunkIndex];
                if (!chunkText) {
                    currentChunkIndex++;
                    speakNextChunk();
                    return;
                }

                const utterance = new SpeechSynthesisUtterance(chunkText);
                utteranceRef.current = utterance; // Prevent GC
                utterance.lang = targetLang;
                if (selectedVoice) utterance.voice = selectedVoice;
                utterance.rate = 1.0;
                utterance.pitch = 1.0;
                utterance.volume = 1.0;

                utterance.onend = () => {
                    currentChunkIndex++;
                    speakNextChunk();
                };

                utterance.onerror = (e) => {
                    console.error('Chunk speech error:', e);
                    // On error, try to skip to next chunk instead of stopping completely
                    if (e.error !== 'interrupted') { // Interrupted usually means user cancelled
                        currentChunkIndex++;
                        speakNextChunk();
                    } else {
                        setIsSpeaking(false);
                        shouldSpeakRef.current = false;
                    }
                };

                console.log(`Speaking chunk ${currentChunkIndex + 1}/${chunks.length}:`, chunkText.substring(0, 20) + '...');
                window.speechSynthesis.speak(utterance);
            };

            // Cancel any current speech before starting
            window.speechSynthesis.cancel();

            // Start speaking first chunk with small delay to ensure cancel processed
            setTimeout(() => {
                if (shouldSpeakRef.current) speakNextChunk();
            }, 50);

        } catch (error) {
            console.error('speakMessage error:', error);
            setIsSpeaking(false);
            shouldSpeakRef.current = false;
        }
    };

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

    // Determine if we should show the speaker icon
    // Hide if it's the last message AND loading is true (currently generating)
    // const isTyping = isLast && loading;
    // const showSpeaker = !isUser && isSupported && message.text && !isTyping;

    const [showSpeakerDelay, setShowSpeakerDelay] = useState(false);

    const isAiMessage = !isUser;
    const isGenerationComplete = isLast && !loading;

    // Calculate if we should show speaker (ignoring delay)
    // currently only showing on last message as per user's previous code
    const shouldShowSpeaker =
        isAiMessage &&
        isSupported &&
        isGenerationComplete &&
        message.text?.trim().length > 0;

    useEffect(() => {
        if (shouldShowSpeaker) {
            const timer = setTimeout(() => {
                setShowSpeakerDelay(true);
            }, 2000); // 2 second delay
            return () => clearTimeout(timer);
        } else {
            setShowSpeakerDelay(false);
        }
    }, [shouldShowSpeaker]);

    const showSpeaker = shouldShowSpeaker && showSpeakerDelay;


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
                display: 'flex',
                alignItems: 'flex-end',
                borderTopRightRadius: isUser ? '4px' : '18px',
                borderTopLeftRadius: isUser ? '18px' : '4px',
                overflowWrap: 'break-word',
                position: 'relative'
            }}>
                {message.image && typeof message.image === 'string' && (
                    <div style={{ marginBottom: '12px' }}>
                        {message.image.startsWith('data:application/pdf') ? (
                            <div
                                onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = message.image;
                                    link.download = 'document.pdf';
                                    link.click();
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px 16px',
                                    backgroundColor: 'var(--surface-color)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    width: 'fit-content',
                                    maxWidth: '300px',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--bg-color-soft)';
                                    e.currentTarget.style.borderColor = 'var(--primary-color)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--surface-color)';
                                    e.currentTarget.style.borderColor = 'var(--border-color)';
                                }}
                            >
                                <div style={{
                                    backgroundColor: 'rgba(255, 59, 48, 0.1)',
                                    padding: '8px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF3B30" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                    </svg>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                    <span style={{
                                        fontSize: '0.9rem',
                                        fontWeight: '500',
                                        color: 'var(--text-main)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        PDF Document
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Click to view/download</span>
                                </div>
                            </div>
                        ) : (
                            <img
                                src={message.image}
                                alt="Message Attachment"
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '400px',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border-color)',
                                    cursor: 'zoom-in'
                                }}
                                onClick={() => window.open(message.image)}
                            />
                        )}
                    </div>
                )}

                {/* Content */}
                {isUser ? (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{message.text}</div>
                ) : (
                    <div className="markdown-container">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                code: CodeBlock
                            }}
                        >
                            {message.text}
                        </ReactMarkdown>
                    </div>
                )}

                {/* Speaker button for AI messages */}
                {showSpeaker && (
                    <button
                        onClick={speakMessage}
                        className={isSpeaking ? 'speaker-active' : ''}
                        style={{
                            background: 'var(--surface-color)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            padding: '6px',
                            cursor: 'pointer',
                            color: isSpeaking ? 'var(--primary-color)' : 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            zIndex: 10,
                            marginBottom: '16px'
                        }}
                        onMouseEnter={(e) => !isSpeaking && (e.currentTarget.style.color = 'var(--text-main)')}
                        onMouseLeave={(e) => !isSpeaking && (e.currentTarget.style.color = 'var(--text-secondary)')}
                        title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                    >
                        {isSpeaking ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="6" y="4" width="4" height="16"></rect>
                                <rect x="14" y="4" width="4" height="16"></rect>
                            </svg>
                        ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                            </svg>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
