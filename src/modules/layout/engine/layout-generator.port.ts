import { GenerationRequest } from './generation-request';
import { Layout } from './model';

export interface GenerationResult {
  layout: Layout;
}

export interface ILayoutGenerator {
  generate(request: GenerationRequest): GenerationResult;
}

export const LAYOUT_GENERATOR = Symbol('LAYOUT_GENERATOR');
