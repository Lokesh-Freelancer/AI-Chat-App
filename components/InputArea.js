import { useState, useRef } from 'react';

export default function InputArea({ onSend, loading }) {
    const [input, setInput] = useState('');
    const [image, setImage] = useState(null); // { name, base64 }
    const fileInputRef = useRef(null);

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

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            alert("Image size should be less than 5MB");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setImage({
                name: file.name,
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
        <div style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'linear-gradient(to top, var(--bg-color) 80%, transparent)',
        }}>
            <div style={{
                maxWidth: '800px',
                width: '100%',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
            }}>
                {/* Image Preview */}
                {image && (
                    <div style={{
                        width: 'fit-content',
                        position: 'relative',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--surface-color)',
                        padding: '4px'
                    }}>
                        <img
                            src={image.base64}
                            alt="Preview"
                            style={{ maxWidth: '120px', maxHeight: '120px', borderRadius: '8px', display: 'block' }}
                        />
                        <button
                            onClick={removeImage}
                            style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                background: 'rgba(0,0,0,0.6)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px'
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
                        accept="image/*"
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
                        onClick={handleSubmit}
                        disabled={(!input.trim() && !image) || loading}
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
                            cursor: (input.trim() || image) && !loading ? 'pointer' : 'default',
                            opacity: (input.trim() || image) && !loading ? 1 : 0.5,
                            transition: 'opacity 0.2s',
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="#131314" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
