export const FRAMEWORKS = [
  {
    id: 'google-adk',
    name: 'Google ADK',
    subtitle: 'Google Agent Development Kit & GenAI SDK',
    description: 'Enterprise reasoning with Gemini 2.0 native multimodal support, tool calling, and high-context processing.',
    defaultModel: 'gemini-2.0-flash',
    exportExtension: '.py',
    category: 'SDK'
  },
  {
    id: 'langgraph',
    name: 'LangGraph',
    subtitle: 'Stateful, cyclic multi-agent graph orchestration',
    description: 'Construct complex agentic loops with human-in-the-loop checkpoints, branching logic, and state schemas.',
    defaultModel: 'gpt-4o',
    exportExtension: '.py',
    category: 'Graph'
  },
  {
    id: 'langchain',
    name: 'LangChain',
    subtitle: 'Composable LCEL chains and agent toolkits',
    description: 'Classic modular framework with prebuilt toolkits, output parsers, and prompt serialization.',
    defaultModel: 'claude-3-5-sonnet',
    exportExtension: '.py',
    category: 'Chains'
  },
  {
    id: 'autogen',
    name: 'AutoGen',
    subtitle: 'Conversational multi-agent patterns by Microsoft',
    description: 'Conversational agents interacting autonomously to plan, critique, execute code, and solve tasks collaboratively.',
    defaultModel: 'gpt-4o',
    exportExtension: '.py',
    category: 'Multi-Agent'
  },
  {
    id: 'crewai',
    name: 'CrewAI',
    subtitle: 'Role-based collaborative autonomous agents',
    description: 'Organize autonomous AI agents into high-performing enterprise crews with defined roles, goals, and backstories.',
    defaultModel: 'gemini-2.0-flash',
    exportExtension: '.py',
    category: 'Role-Based'
  },
  {
    id: 'openai-swarm',
    name: 'OpenAI Swarm',
    subtitle: 'Ergonomic multi-agent routine & handoff orchestration',
    description: 'Lightweight, client-side multi-agent coordination with native function calling and dynamic agent handoffs.',
    defaultModel: 'gpt-4o',
    exportExtension: '.py',
    category: 'Routines'
  },
  {
    id: 'microsoft-adk',
    name: 'Microsoft ADK',
    subtitle: 'Microsoft Semantic Kernel & Enterprise Agent Framework',
    description: 'Institutional-grade enterprise agent framework with plugin pipelines, native memory filters, and Copilot integration.',
    defaultModel: 'gpt-4o',
    exportExtension: '.py',
    category: 'Enterprise'
  }
];
