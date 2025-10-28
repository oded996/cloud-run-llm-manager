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

export const ChatCard = ({ serviceUrl, modelSource }: { serviceUrl: string, modelSource: 'ollama' | 'huggingface' }) => {
  const [models, setModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchModels = async () => {
      setIsLoadingModels(true);
      try {
        // Choose the path and method based on the model source
        const isOllama = modelSource === 'ollama';
        const path = isOllama ? '/api/tags' : '/v1/models';
        const method = isOllama ? 'GET' : 'GET'; // Ollama uses GET, vLLM also uses GET for listing models

        const response = await fetch('/api/services/chat', {
          method: 'POST', // Our proxy always uses POST
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serviceUrl,
            path,
            method, // Pass the intended method to the proxy
            payload: {},
          }),
        });
        const data = await response.json();

        let loadedModels = [];
        if (isOllama && data.models) {
          // Adapt Ollama's response: { models: [{ name: 'llama3:latest', ... }] }
          loadedModels = data.models.map((m: any) => ({ id: m.name }));
        } else if (!isOllama && data.data) {
          // Use vLLM's response: { data: [{ id: 'meta-llama/Meta-Llama-3-8B-Instruct', ... }] }
          loadedModels = data.data;
        }

        setModels(loadedModels);
        if (loadedModels.length > 0) {
          setSelectedModel(loadedModels[0].id);
        }

      } catch (error) {
        console.error('Failed to fetch models:', error);
      } finally {
        setIsLoadingModels(false);
      }
    };

    fetchModels();
  }, [serviceUrl, modelSource]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: inputValue }];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const isOllama = modelSource === 'ollama';
      const path = isOllama ? '/api/chat' : '/v1/chat/completions';

      const response = await fetch('/api/services/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceUrl,
          path: path,
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
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += value;
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last, possibly incomplete, line

        for (const line of lines) {
          if (!line.trim()) continue;

          const isOllamaStream = modelSource === 'ollama';
          let chunk = line;

          // For vLLM/OpenAI, remove the 'data: ' prefix
          if (!isOllamaStream) {
            if (line.startsWith('data: ')) {
              chunk = line.substring(6);
            } else {
              continue;
            }
          }
          
          if (chunk.trim() === '[DONE]') {
            break;
          }

          try {
            const json = JSON.parse(chunk);
            let content = '';

            if (isOllama) {
              if (json.message && json.message.content) {
                content = json.message.content;
              }
            }
            else {
              if (json.choices && json.choices[0].delta.content) {
                content = json.choices[0].delta.content;
              }
            }

            if (content) {
              setMessages(prev => {
                const lastMessage = prev[prev.length - 1];
                const updatedLastMessage = { ...lastMessage, content: lastMessage.content + content };
                return [...prev.slice(0, -1), updatedLastMessage];
              });
            }
          } catch (e) {
            console.error('Failed to parse stream chunk:', chunk, e);
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
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
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
