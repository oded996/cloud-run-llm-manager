'use client';

import React, { useState, useEffect, useRef } from 'react';

interface ChatCardProps {
  serviceUrl: string;
}

interface Model {
  id: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const ChatCard = ({ serviceUrl }: ChatCardProps) => {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('/api/services/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serviceUrl, endpoint: '/v1/models', method: 'GET' }),
        });
        if (!response.ok) throw new Error('Failed to fetch models.');
        const data = await response.json();
        const modelsData = Array.isArray(data.data) ? data.data : [];
        setModels(modelsData);
        if (modelsData.length > 0) {
          setSelectedModel(modelsData[0].id);
        }
      } catch (err: any) {
        setError('Could not connect to the model service. Ensure it is running and accessible.');
      }
    };
    fetchModels();
  }, [serviceUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/services/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceUrl,
          endpoint: '/v1/chat/completions',
          method: 'POST',
          payload: {
            model: selectedModel,
            messages: newMessages,
            stream: true,
          },
        }),
      });

      if (!response.body) throw new Error('No response body.');

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let assistantResponse = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const lines = value.split('\n').filter(line => line.startsWith('data: '));
        for (const line of lines) {
          const chunk = line.substring(6);
          if (chunk.trim() === '[DONE]') {
            break;
          }
          const json = JSON.parse(chunk);
          if (json.choices && json.choices[0].delta.content) {
            assistantResponse += json.choices[0].delta.content;
            setMessages(prev => {
              const lastMessage = prev[prev.length - 1];
              lastMessage.content = assistantResponse;
              return [...prev.slice(0, -1), lastMessage];
            });
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="bg-white border border-gray-200 rounded-md">
      <div className="p-4 border-b"><h2 className="text-base font-medium">Chat with LLM</h2></div>
      <div className="p-4">
        <div className="flex items-center space-x-2 mb-4">
          <label htmlFor="model" className="text-sm font-medium">Model:</label>
          <select
            id="model"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="flex-grow p-2 border border-gray-300 rounded-md"
          >
            {models.map(m => <option key={m.id} value={m.id}>{m.id}</option>)}
          </select>
        </div>
        <div ref={chatContainerRef} className="h-64 overflow-y-auto border border-gray-200 rounded-md p-2 mb-4 bg-gray-50">
          {messages.map((msg, i) => (
            <div key={i} className={`mb-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
              <span className={`inline-block p-2 rounded-lg ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
                {msg.content}
              </span>
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit}>
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-grow p-2 border border-gray-300 rounded-md"
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
              {isLoading ? 'Thinking...' : 'Send'}
            </button>
          </div>
        </form>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
    </div>
  );
};
