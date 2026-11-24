import type { ToolConfig } from '@itsjust/core';

const toolConfig = {
  id: 'compound-interest-calculator',
  name: 'Compound Interest Calculator',
  description:
    'Compute compound growth of savings and investments with contributions, compounding frequency, inflation adjustment, and growth charts.',
  version: '1.0.0',
  exportFormats: ['json', 'png', 'jpeg', 'webp', 'pdf'] as const,
  features: {
    export: true,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    accent: '#059669',
    accentHover: '#047857',
    accentSubtle: 'rgba(5, 150, 105, 0.08)',
    brand: 'Compound Interest Calculator',
    icon: '📈',
  },
} satisfies ToolConfig;

export default toolConfig;
