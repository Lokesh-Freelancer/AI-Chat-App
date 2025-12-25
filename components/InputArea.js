import { useState, useRef, useEffect } from 'react';

export default function InputArea({ onSend, loading, onStop }) {
    const [input, setInput] = useState('');
    const [image, setImage] = useState(null); // { name, base64 }
    const [isRecording, setIsRecording] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const fileInputRef = useRef(null);
    const recognitionRef = useRef(null);


    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            console.log('✅ Speech Recognition is supported');
            setIsSupported(true);
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';
            recognitionRef.current.maxAlternatives = 1;

            recognitionRef.current.onstart = () => {
                console.log('🎤 Recording started');
            };

            recognitionRef.current.onresult = (event) => {
                console.log('📝 Speech recognition result:', event);
                const transcript = Array.from(event.results)
                    .map(result => result[0])
                    .map(result => result.transcript)
                    .join('');
                console.log('✅ Transcribed text:', transcript);
                setInput(transcript);
            };

            recognitionRef.current.onerror = (event) => {
                console.error('❌ Speech recognition error:', event.error);
                console.error('Error details:', event);

                // Don't stop recording on no-speech error, just log it
                if (event.error === 'no-speech') {
                    console.warn('⚠️ No speech detected yet, keep speaking...');
                    return; // Don't stop recording or show alert
                }

                setIsRecording(false);

                // User-friendly error messages for critical errors only
                if (event.error === 'not-allowed') {
                    alert('Microphone access denied. Please allow microphone permission in your browser settings.');
                } else if (event.error === 'network') {
                    alert('Network error. Speech recognition requires internet connection.');
                } else if (event.error === 'aborted') {
                    console.log('Recording was aborted');
                } else {
                    alert(`Speech recognition error: ${event.error}`);
                }
            };

            recognitionRef.current.onend = () => {
                console.log('🛑 Recording stopped');
                setIsRecording(false);
            };
        } else {
            console.warn('⚠️ Speech Recognition is NOT supported in this browser');
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const toggleRecording = () => {
        if (!isSupported) {
            alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
            return;
        }

        if (isRecording) {
            console.log('Stopping recording...');
            recognitionRef.current.stop();
            setIsRecording(false);
        } else {
            console.log('Starting recording...');
            try {
                recognitionRef.current.start();
                setIsRecording(true);
                console.log('✅ Recording started successfully');
            } catch (error) {
                console.error('❌ Failed to start recording:', error);
                alert('Failed to start recording. Please check microphone permissions and try again.');
            }
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if ((!input.trim() && !image) || loading) return;
        onSend(input, image?.base64);
        setInput('');
        setImage(null);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) { // 10MB limit for docs
            alert("File size should be less than 10MB");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setImage({
                name: file.name,
                type: file.type,
                base64: reader.result
            });
        };
        reader.readAsDataURL(file);
    };

    const removeImage = () => {
        setImage(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="input-area-container" style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'linear-gradient(to top, var(--bg-color) 80%, transparent)',
        }}>
            <div className="input-container-inner" style={{
                maxWidth: '800px',
                width: '100%',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
            }}>

                {image && (
                    <div style={{
                        width: 'fit-content',
                        position: 'relative',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--surface-color)',
                        padding: image.type === 'application/pdf' ? '12px' : '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        minWidth: image.type === 'application/pdf' ? '200px' : 'auto'
                    }}>
                        {image.type === 'application/pdf' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                                <div style={{
                                    backgroundColor: 'rgba(255, 59, 48, 0.1)',
                                    padding: '8px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF3B30" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                    </svg>
                                </div>
                                <span style={{
                                    fontSize: '0.85rem',
                                    color: 'var(--text-main)',
                                    maxWidth: '120px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    fontWeight: '500'
                                }}>
                                    {image.name}
                                </span>
                            </div>
                        ) : (
                            <img
                                src={image.base64}
                                alt="Preview"
                                style={{ maxWidth: '120px', maxHeight: '120px', borderRadius: '8px', display: 'block' }}
                            />
                        )}
                        <button
                            onClick={removeImage}
                            style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                background: 'rgba(0,0,0,0.6)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                zIndex: 10
                            }}
                        >
                            ×
                        </button>
                    </div>
                )}

                <div style={{
                    backgroundColor: 'var(--input-bg)',
                    borderRadius: '24px',
                    border: '1px solid var(--border-color)',
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                }}>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*,application/pdf"
                        style={{ display: 'none' }}
                    />

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: '8px',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-main)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                        </svg>
                    </button>

                    {isSupported && (
                        <button
                            onClick={toggleRecording}
                            className={isRecording ? 'mic-recording' : ''}
                            style={{
                                background: 'none',
                                border: 'none',
                                padding: '8px',
                                cursor: 'pointer',
                                color: isRecording ? '#ff4444' : 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'color 0.2s',
                                position: 'relative'
                            }}
                            onMouseEnter={(e) => !isRecording && (e.currentTarget.style.color = 'var(--text-main)')}
                            onMouseLeave={(e) => !isRecording && (e.currentTarget.style.color = 'var(--text-secondary)')}
                            title={isRecording ? 'Stop recording' : 'Start voice input'}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                <line x1="12" y1="19" x2="12" y2="23"></line>
                                <line x1="8" y1="23" x2="16" y2="23"></line>
                            </svg>
                        </button>
                    )}

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
                            height: '24px',
                            maxHeight: '200px',
                            fontSize: '1rem',
                            fontFamily: 'inherit',
                        }}
                        rows={1}
                    />
                    <button
                        onClick={loading ? onStop : handleSubmit}
                        disabled={!loading && !input.trim() && !image}
                        style={{
                            background: loading ? 'transparent' : 'var(--primary-color)',
                            border: loading ? '2px solid var(--text-main)' : 'none',
                            borderRadius: loading ? '50%' : '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginLeft: '10px',
                            cursor: (loading || input.trim() || image) ? 'pointer' : 'default',
                            opacity: (loading || input.trim() || image) ? 1 : 0.5,
                            transition: 'all 0.2s',
                        }}
                    >
                        {loading ? (

                            <div style={{ width: '10px', height: '10px', backgroundColor: 'var(--text-main)', borderRadius: '2px' }}></div>
                        ) : (

                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="#ffffff" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
