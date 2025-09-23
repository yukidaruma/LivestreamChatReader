import { main } from '../content';
import { t, useMount, useStorage } from '@extension/shared';
import { extensionEnabledStorage } from '@extension/storage';
import { cn } from '@extension/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import './ChatTest.css';

const MAX_MESSAGE_COUNT = 20;

// Simulated user messages
const randomMessages = [
  'Hello',
  'Hi',
  'Well played',
  'こんにちは',
  'ありがとう',
  'おつかれさまでした',
  'ナイス！',
  '😄',
];

const randomNames = ['Donut', 'Choco', 'タルト', 'クレープ'];

type Message = {
  id: number;
  name: string;
  body: string;
  isAuto: boolean;
};

declare global {
  interface Window {
    addMessage?: (message: { name: string; body: string; isAuto?: boolean }) => void;
    hasLoadedContentScript?: boolean;
  }
}

const ChatTest = () => {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const bodyInputRef = useRef<HTMLInputElement>(null);
  const intervalSelectRef = useRef<HTMLSelectElement>(null);

  const extensionEnabled = useStorage(extensionEnabledStorage).enabled;
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [intervalMs, setIntervalMs] = useState(5000);
  const [nameInput, setNameInput] = useState('User');
  const [bodyInput, setBodyInput] = useState('');

  const addMessage = ({ name, body, isAuto = false }: { name: string; body: string; isAuto?: boolean }) => {
    if (!name || !body.trim()) {
      return;
    }

    setMessages(prev => {
      const newId = prev.length > 0 ? Math.max(...prev.map(m => m.id)) + 1 : 1;
      const newMessage: Message = { id: newId, name, body, isAuto };
      const updated = [...prev, newMessage];

      // Remove old messages if count exceeds limit
      if (updated.length > MAX_MESSAGE_COUNT) {
        return updated.slice(updated.length - MAX_MESSAGE_COUNT);
      }
      return updated;
    });
  };

  const addManualMessage = () => {
    if (!bodyInput.trim()) {
      return;
    }
    addMessage({ name: nameInput, body: bodyInput });
    setBodyInput('');
  };

  const addRandomMessage = useCallback(() => {
    const name = randomNames[Math.floor(Math.random() * randomNames.length)];
    const body = randomMessages[Math.floor(Math.random() * randomMessages.length)];
    addMessage({ name, body, isAuto: true });
  }, []);

  const toggleMode = useCallback(() => {
    setIsAutoMode(prev => !prev);
  }, []);

  const updateInterval = (newInterval: number) => {
    setIntervalMs(newInterval);
  };

  // Auto mode effect with useEffect-based interval
  useEffect(() => {
    if (!isAutoMode) {
      return;
    }

    const timer = setInterval(() => {
      addRandomMessage();
    }, intervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [isAutoMode, intervalMs, addRandomMessage]);

  // Initialize content script
  useMount(() => {
    if (window.hasLoadedContentScript) return;

    window.hasLoadedContentScript = true;
    main();

    window.addMessage = addMessage;

    return () => delete window.addMessage;
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        e.preventDefault();
        switch (e.key) {
          case 'a':
            addRandomMessage();
            break;
          case 'm':
            toggleMode();
            break;
        }
      }
    };

    const handleKeyPress = (_e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT');

      if (!isInputFocused && bodyInputRef.current) {
        bodyInputRef.current.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keypress', handleKeyPress);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keypress', handleKeyPress);
    };
  }, [addRandomMessage, toggleMode]);

  const handleEnterKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addManualMessage();
    }
  };

  return (
    <div className="text-sm">
      <h1 className="mb-4 text-xl font-bold">{t('testPageTitle')}</h1>

      {extensionEnabled || <p className="mb-4 text-red-500">{t('extensionDisabledTestMessage')}</p>}

      <section className="mb-4">
        <h2 className="mb-2 text-lg font-semibold">Chat Controls</h2>
        <div className="mb-2 select-none">
          <strong>
            <u>M</u>ode:
          </strong>
          <button
            onClick={toggleMode}
            className={`ml-2 rounded px-2 py-1 ${isAutoMode ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
            {isAutoMode ? 'Auto' : 'Manual'}
          </button>
        </div>

        {!isAutoMode && (
          <div className="mb-2 flex items-center gap-2">
            <input
              ref={nameInputRef}
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              placeholder="name"
              className="max-w-24!"
            />
            <input
              ref={bodyInputRef}
              type="text"
              value={bodyInput}
              onChange={e => setBodyInput(e.target.value)}
              onKeyDown={handleEnterKey}
              placeholder="message"
              className="max-w-none!"
            />
            <button onClick={addManualMessage}>Add Message</button>
            <button onClick={addRandomMessage}>
              <u>A</u>dd Random
            </button>
          </div>
        )}

        {isAutoMode && (
          <div className="mb-2 flex items-center gap-2">
            <label>Auto post interval:</label>
            <select
              ref={intervalSelectRef}
              value={intervalMs}
              onChange={e => updateInterval(parseInt(e.target.value))}
              className="max-w-20!">
              <option value="1000">1s</option>
              <option value="5000">5s</option>
              <option value="10000">10s</option>
            </select>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Chat Logs</h2>
        <div id="items" className="bg-secondary h-96 overflow-y-auto rounded p-2">
          {messages.map(message => (
            <yt-live-chat-text-message-renderer
              key={message.id}
              id={message.id.toString()}
              className={cn('space-x-2', message.isAuto ? 'auto-message' : '')}>
              <yt-live-chat-author-chip id="author-name">{message.name}</yt-live-chat-author-chip>
              <yt-formatted-string id="message">{message.body}</yt-formatted-string>
            </yt-live-chat-text-message-renderer>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ChatTest;
