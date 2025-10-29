// src/app/config/suggested-models.ts

export interface SuggestedModel {
    name: string;
    size: string;
    description: string;
    gpu: 'L4' | 'H100 / RTX';
    hfId?: string;
    ollamaId?: string;
}

export const SUGGESTED_MODELS: SuggestedModel[] = [
    // L4 Tier
    { name: 'Gemma 3 4B', size: '4B', description: "Google's latest generation, balanced performance.", gpu: 'L4', hfId: 'google/gemma-3-4b-it', ollamaId: 'gemma3:4b' },
    { name: 'Gemma 3 1B', size: '1B', description: "Google's latest, lightweight and very fast.", gpu: 'L4', hfId: 'google/gemma-3-1b-it', ollamaId: 'gemma3:1b' },
    { name: 'Llama 3 8B', size: '8B', description: 'Industry-standard, high-performance model from Meta.', gpu: 'L4', hfId: 'meta-llama/Meta-Llama-3-8B-Instruct', ollamaId: 'llama3:8b' },
    { name: 'Phi-3 Mini', size: '3.8B', description: 'Top-tier small model from Microsoft, very capable.', gpu: 'L4', hfId: 'microsoft/Phi-3-mini-4k-instruct', ollamaId: 'phi3' },
    { name: 'Mistral 7B', size: '7B', description: 'Very popular, efficient, and powerful model.', gpu: 'L4', hfId: 'mistralai/Mistral-7B-Instruct-v0.3', ollamaId: 'mistral' },
    { name: 'Qwen2 7B', size: '7B', description: 'Strong multilingual model from Alibaba.', gpu: 'L4', hfId: 'Qwen/Qwen2-7B-Instruct', ollamaId: 'qwen2:7b' },
    { name: 'Gemma 2 9B', size: '9B', description: 'Previous generation Gemma, still excellent.', gpu: 'L4', hfId: 'google/gemma-2-9b-it', ollamaId: 'gemma2:9b' },
    { name: 'Code Llama 7B', size: '7B', description: 'Llama fine-tuned for code generation and discussion.', gpu: 'L4', hfId: 'codellama/CodeLlama-7b-Instruct-hf', ollamaId: 'codellama:7b' },
    { name: 'Phi-3 Medium', size: '14B', description: 'A highly capable model that fits on a single L4.', gpu: 'L4', hfId: 'microsoft/Phi-3-medium-4k-instruct', ollamaId: 'phi3:medium' },
    { name: 'Llama 2 13B', size: '13B', description: "A very popular and solid choice from Meta's V2.", gpu: 'L4', hfId: 'meta-llama/Llama-2-13b-chat-hf', ollamaId: 'llama2:13b' },
    { name: 'Gemma 3 12B', size: '12B', description: "High-performance model from Google's latest family.", gpu: 'L4', hfId: 'google/gemma-3-12b-it', ollamaId: 'gemma3:12b' },
    { name: 'GPT-OSS 20B', size: '20B', description: 'OpenAI\'s powerful and versatile 20B model.', gpu: 'L4', hfId: 'EleutherAI/gpt-neox-20b', ollamaId: 'gpt-oss:20b' },
    
    // H100 / RTX Tier
    { name: 'Gemma 3 27B', size: '27B', description: "Google's largest open Gemma 3 model.", gpu: 'H100 / RTX', hfId: 'google/gemma-3-27b-it', ollamaId: 'gemma3:27b' },
    { name: 'Mistral Nemo 12B', size: '12B', description: 'New, powerful model from Mistral AI.', gpu: 'H100 / RTX', hfId: 'mistralai/Mistral-Nemo-12B-Instruct-v0.1', ollamaId: 'nemo' },
    { name: 'Mixtral 8x7B', size: '47B', description: 'Top-performing Mixture-of-Experts model.', gpu: 'H100 / RTX', hfId: 'mistralai/Mixtral-8x7B-Instruct-v0.1', ollamaId: 'mixtral' },
    { name: 'Llama 3 70B', size: '70B', description: 'Large-scale, high-performance model from Meta.', gpu: 'H100 / RTX', hfId: 'meta-llama/Meta-Llama-3-70B-Instruct', ollamaId: 'llama3:70b' },
    { name: 'Command R+', size: '104B', description: 'State-of-the-art model for RAG and tool use.', gpu: 'H100 / RTX', hfId: 'CohereForAI/c4ai-command-r-plus', ollamaId: 'command-r-plus' },
    { name: 'GPT-OSS 120B', size: '120B', description: 'OpenAI\'s largest and most powerful open model.', gpu: 'H100 / RTX', hfId: 'Qwen/Qwen1.5-110B-Chat', ollamaId: 'gpt-oss:120b' },
];