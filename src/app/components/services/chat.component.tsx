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

export const ChatCard = ({ serviceUrl, modelSource, configuredModel }: { serviceUrl: string, modelSource: 'ollama' | 'huggingface', configuredModel?: string }) => {
  const [models, setModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isModelReady, setIsModelReady] = useState(false);
  const [modelLoadingMessage, setModelLoadingMessage] = useState('Initializing model...');

  useEffect(() => {
    const loadAndVerifyModel = async (modelToLoad: string) => {
        setModelLoadingMessage(`Loading model ${modelToLoad} into GPU memory... (this may take a moment)`);
        try {
            // This request acts as a "wake-up" call. It will only complete
            // once the model is fully loaded and ready for inference.
            const response = await fetch('/api/services/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serviceUrl,
                    path: '/api/generate',
                    method: 'POST',
                    payload: { model: modelToLoad, prompt: 'hello', stream: false },
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to load model.');
            }
            
            // If the request succeeds, the model is ready.
            setIsModelReady(true);

        } catch (error: any) {
            console.error("Failed to trigger model load:", error);
            setError(`Failed to load model: ${error.message}`);
        }
    };

    const fetchModelsAndLoad = async () => {
      setIsLoadingModels(true);
      setError(null);
      try {
        const isOllama = modelSource === 'ollama';
        const path = isOllama ? '/api/tags' : '/v1/models';
        const method = 'GET';

        const response = await fetch('/api/services/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serviceUrl, path, method, payload: {} }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Could not fetch models from the service.');
        }
        const data = await response.json();

        let loadedModels = [];
        if (isOllama && data.models) {
          loadedModels = data.models.map((m: any) => ({ id: m.name }));
        } else if (!isOllama && data.data) {
          loadedModels = data.data;
        }

        setModels(loadedModels);
        
        let modelToLoad = '';
        if (loadedModels.length > 0) {
          const modelExists = loadedModels.some((m: any) => m.id === configuredModel);
          modelToLoad = (configuredModel && modelExists) ? configuredModel : loadedModels[0].id;
          setSelectedModel(modelToLoad);
        } else {
            throw new Error('No models found on the service.');
        }

        if (isOllama && modelToLoad) {
            await loadAndVerifyModel(modelToLoad);
        } else if (!isOllama && loadedModels.length > 0) {
            setIsModelReady(true); // For vLLM, assume it's ready after fetching models if models are found
        } else if (!isOllama && loadedModels.length === 0) {
            throw new Error('No models found on the vLLM service.');
        }

      } catch (error: any) {
        console.error('Failed to fetch models:', error);
        setError(error.message);
      } finally {
        setIsLoadingModels(false);
      }
    };

    fetchModelsAndLoad();
  }, [serviceUrl, modelSource, configuredModel]);

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

  if (!isModelReady) {
      return (
          <div className="p-6 text-center">
              {error ? (
                  <p className="text-red-500">{error}</p>
              ) : (
                  <>
                    <p className="text-gray-600">{modelLoadingMessage}</p>
                    <p className="text-sm text-gray-500 mt-2">This is expected during a cold start.</p>
                  </>
              )}
          </div>
      );
  }

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
            disabled={isLoadingModels || !isModelReady}
          >
            {models.map((m: any) => <option key={m.id} value={m.id}>{m.id}</option>)}
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
              disabled={isLoading || !isModelReady}
            />
            <button type="submit" disabled={isLoading || !isModelReady} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
              {isLoading ? 'Thinking...' : 'Send'}
            </button>
          </div>
        </form>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
    </div>
  );
};
