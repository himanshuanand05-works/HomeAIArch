import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ResourceNotFoundError } from '../../common/errors/domain-errors';

export interface TemplateView {
  id: string;
  slug: string;
  name: string;
  region: string | null;
  version: number;
  isActive: boolean;
  wallThicknessMm: number;
  wallNote: string | null;
  circulationRatio: number;
  doorWidthMm: number;
  staircase: unknown;
  roomDefaults: unknown;
  kitchenDefaults: unknown;
  bathDefaults: unknown;
  mandatoryDefaults: unknown;
}

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<TemplateView[]> {
    const templates = await this.prisma.designTemplate.findMany({
      where: { isActive: true },
      orderBy: { version: 'desc' },
    });
    return templates.map((template) => this.toView(template));
  }

  async findById(id: string): Promise<TemplateView> {
    const template = await this.prisma.designTemplate.findUnique({ where: { id } });
    if (!template) {
      throw new ResourceNotFoundError(`DesignTemplate ${id} not found`);
    }
    return this.toView(template);
  }

  private toView(template: {
    id: string;
    slug: string;
    name: string;
    region: string | null;
    version: number;
    isActive: boolean;
    wallThicknessMm: number;
    wallNote: string | null;
    circulationRatio: number;
    doorWidthMm: number;
    staircase: unknown;
    roomDefaults: unknown;
    kitchenDefaults: unknown;
    bathDefaults: unknown;
    mandatoryDefaults: unknown;
  }): TemplateView {
    return {
      id: template.id,
      slug: template.slug,
      name: template.name,
      region: template.region,
      version: template.version,
      isActive: template.isActive,
      wallThicknessMm: template.wallThicknessMm,
      wallNote: template.wallNote,
      circulationRatio: template.circulationRatio,
      doorWidthMm: template.doorWidthMm,
      staircase: template.staircase,
      roomDefaults: template.roomDefaults,
      kitchenDefaults: template.kitchenDefaults,
      bathDefaults: template.bathDefaults,
      mandatoryDefaults: template.mandatoryDefaults,
    };
  }
}
