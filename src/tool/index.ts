export { default as toolConfig } from './tool.config';
export { templateBaseVersion } from './template-metadata';
export { templateMetadata, getPublicSiteUrl } from './template-metadata';
export {
  compoundInterestCalculatorTool,
  serializeState,
  deserializeState,
  roundTrips,
} from './tool-definition';
export { Canvas } from './components/Canvas';
export { Sidebar } from './components/Sidebar';
export { Toolbar } from './components/Toolbar';
export { MODES } from './ui-shared';
export {
  DEFAULT_STATE,
  FREQUENCIES,
  parseNumber,
  formatNumber,
  formatCurrency,
  periodsPerYear,
  computeSchedule,
  resultText,
  stepsFor,
  summaryText,
} from './types';
export type { Frequency, ScheduleResult, ScheduleRow, ToolState } from './types';
