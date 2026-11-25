'use client';
import React, { useEffect, useRef, useState } from 'react'

const MAX_TEXTAREA_HEIGHT = 200; // px — scrolls after this

// ---------- Types ----------

export interface ChatHistoryItem {
    role: 'user' | 'assistant';
    content: string;
}

/** One parsed server-sent event from a streaming backend. */
export interface StreamEvent {
    content?: string; // text to append to the reply
    error?: string;   // error reported by the server mid-stream
    done?: boolean;   // the reply is complete
}

export interface ChatInterfaceProps {
    /** Full URL of the chat endpoint, e.g. "http://localhost:8000/chat/stream". */
    endpoint: string;
    /** "stream": reply arrives as server-sent events. "json": reply arrives as one JSON response. Default "stream". */
    mode?: 'stream' | 'json';

    /** Header text. */
    title?: string;
    /** First bot message shown before the user types anything. Pass "" for none. */
    greeting?: string;
    placeholder?: string;
    /** Shown in the bubble when a request fails and no text was received. */
    errorMessage?: string;

    /** Extra request headers, e.g. { Authorization: "Bearer ..." }. */
    headers?: Record<string, string>;
    /** Shape of the POST body. Default: { message, history }. */
    buildRequestBody?: (message: string, history: ChatHistoryItem[]) => unknown;
    /** "json" mode: pull the reply text out of the response. Default: data.reply. */
    parseResponse?: (data: unknown) => string;
    /** "stream" mode: turn one SSE `data:` payload into an event. Default: `[DONE]` ends, otherwise JSON { content?, error? }. */
    parseStreamEvent?: (data: string) => StreamEvent;

    /** Called with any request/stream error (after the bubble is marked as failed). */
    onError?: (error: unknown) => void;
    /** Extra classes for the outer container (e.g. sizing or margins). */
    className?: string;
}

// ---------- Defaults (match the FastAPI backend in v1/main.py) ----------

const defaultBuildRequestBody = (message: string, history: ChatHistoryItem[]) => ({ message, history });

const defaultParseResponse = (data: unknown): string => {
    const reply = (data as { reply?: unknown })?.reply;
    if (typeof reply !== 'string') throw new Error('Response has no "reply" field');
    return reply;
};

const defaultParseStreamEvent = (data: string): StreamEvent => {
    if (data === '[DONE]') return { done: true };
    return JSON.parse(data) as StreamEvent;
};

// ---------- Component ----------

interface Message {
    text: string;
    sender: 'user' | 'bot';
    error?: boolean;
}

const bubbleStyle = (message: Message) => {
    if (message.sender === 'user') return 'self-end bg-green-500 rounded-br-sm';
    if (message.error) return 'self-start bg-red-500 rounded-bl-sm';
    return 'self-start bg-blue-500 rounded-bl-sm';
};

const ChatInterface = ({
    endpoint,
    mode = 'stream',
    title = 'Assistant',
    greeting = 'Hello! How can I assist you today?',
    placeholder = 'Type your message...',
    errorMessage = 'Sorry, something went wrong. Please try again.',
    headers,
    buildRequestBody = defaultBuildRequestBody,
    parseResponse = defaultParseResponse,
    parseStreamEvent = defaultParseStreamEvent,
    onError,
    className = '',
}: ChatInterfaceProps) => {
    const [messages, setMessages] = useState<Message[]>(
        greeting ? [{ text: greeting, sender: 'bot' }] : []
    );
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);
    // Follow new messages only while the user is at the bottom, so scrolling up to read isn't interrupted
    const stickToBottom = useRef(true);

    // Cancel any in-flight request if the component unmounts
    useEffect(() => () => abortRef.current?.abort(), []);

    const handleScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    };

    useEffect(() => {
        const el = scrollRef.current;
        if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
    }, [messages]);

    const resizeTextarea = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
        el.style.overflowY = el.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden';
    };

    // Replace the last (bot) message in the list
    const updateLastMessage = (update: (m: Message) => Message) => {
        setMessages(prev => [...prev.slice(0, -1), update(prev[prev.length - 1])]);
    };

    const readStream = async (body: ReadableStream<Uint8Array>) => {
        const reader = body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const chunk = await reader.read();
            if (chunk.done) throw new Error('Stream ended unexpectedly');
            buffer += decoder.decode(chunk.value, { stream: true }).replace(/\r\n/g, '\n');

            const events = buffer.split('\n\n');
            buffer = events.pop() ?? ''; // keep any incomplete event for the next read

            for (const event of events) {
                // An SSE event can span several "data:" lines; other fields (event:, id:) are ignored
                const data = event
                    .split('\n')
                    .filter(line => line.startsWith('data:'))
                    .map(line => line.slice(5).trimStart())
                    .join('\n');
                if (!data) continue;

                const parsed = parseStreamEvent(data);
                if (parsed.error) throw new Error(parsed.error);
                if (parsed.content) {
                    const content = parsed.content;
                    updateLastMessage(m => ({ ...m, text: m.text + content }));
                }
                if (parsed.done) {
                    await reader.cancel();
                    return;
                }
            }
        }
    };

    const sendMessage = async () => {
        const text = input.trim();
        if (text === '' || isLoading) return;

        // History sent to the backend: everything before this message, minus failed replies
        const history: ChatHistoryItem[] = messages
            .filter(m => !m.error)
            .map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));

        stickToBottom.current = true; // always jump to the newest message when sending
        setMessages(prev => [...prev, { text, sender: 'user' }, { text: '', sender: 'bot' }]);
        setInput('');
        requestAnimationFrame(resizeTextarea);
        setIsLoading(true);

        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...headers },
                body: JSON.stringify(buildRequestBody(text, history)),
                signal: controller.signal,
            });
            if (!res.ok) throw new Error(`Request failed with status ${res.status}`);

            if (mode === 'stream') {
                if (!res.body) throw new Error('Response has no body to stream');
                await readStream(res.body);
            } else {
                const reply = parseResponse(await res.json());
                updateLastMessage(m => ({ ...m, text: reply }));
            }
        } catch (err) {
            if (controller.signal.aborted) return; // unmounted — nothing to update
            console.error(err);
            updateLastMessage(m => ({ ...m, text: m.text || errorMessage, error: true }));
            onError?.(err);
        } finally {
            if (!controller.signal.aborted) setIsLoading(false);
        }
    };

    return (
        <div className={`h-full bg-gray-200 rounded-lg flex flex-col overflow-hidden ${className}`}>
            <div className="shrink-0 px-4 py-3 border-b border-gray-300 font-medium flex items-center justify-between">
                <span>{title}</span>
                {isLoading && <span className="text-sm text-gray-500 animate-pulse">typing…</span>}
            </div>

            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-y-2"
            >
                {
                    messages.map((message, index) => (
                        <div key={index} className={`${bubbleStyle(message)} max-w-[80%] text-white px-3 py-2 rounded-2xl shadow-sm whitespace-pre-wrap wrap-break-word`}>
                            {message.text || (isLoading && index === messages.length - 1 ? <span className="animate-pulse">Thinking…</span> : null)}
                        </div>
                    ))
                }
            </div>

            <form className="shrink-0 flex gap-x-2 w-full bg-gray-300 p-2" onSubmit={(e) => {
                e.preventDefault();
                void sendMessage();
            }}>
                <textarea
                    ref={textareaRef}
                    className="w-full bg-white p-2 rounded-lg resize-none overflow-hidden"
                    rows={1}
                    placeholder={placeholder}
                    value={input}
                    onChange={(e) => {
                        setInput(e.target.value);
                        resizeTextarea();
                    }}
                    onKeyDown={(e) => {
                        // Enter sends, Shift+Enter adds a new line
                        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            void sendMessage();
                        }
                    }}
                />
                <button
                    type="submit"
                    disabled={isLoading || input.trim() === ''}
                    className="bg-green-500 text-white px-4 rounded-lg self-end h-10 disabled:opacity-50"
                >
                    Send
                </button>
            </form>

        </div>
    )
}

export default ChatInterface
