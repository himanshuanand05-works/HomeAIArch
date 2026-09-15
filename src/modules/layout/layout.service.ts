import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictError, ResourceNotFoundError } from '../../common/errors/domain-errors';
import { ILayoutGenerator, LAYOUT_GENERATOR } from './engine/layout-generator.port';
import { Layout } from './engine/model';
import { PrefsService } from '../prefs/prefs.service';
import { CreateIterationDto, GenerateDesignDto } from './dto/design.dto';

export interface DesignView {
  id: string;
  projectId: string;
  versionNumber: number;
  parentId: string | null;
  status: string;
  changeRequest: unknown;
  layout: Layout;
  metrics: unknown;
  diagnostics: unknown;
  seed: number | null;
  createdAt: Date;
}

@Injectable()
export class LayoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prefs: PrefsService,
    @Inject(LAYOUT_GENERATOR) private readonly generator: ILayoutGenerator,
  ) {}

  async generateInitial(projectId: string, dto: GenerateDesignDto): Promise<DesignView> {
    const project = await this.loadProject(projectId);
    const existing = await this.prisma.designVersion.findUnique({
      where: {
        projectId_versionNumber: { projectId, versionNumber: 1 },
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictError(
        `Project ${projectId} already has a version 1; use iterations to branch`,
      );
    }

    const prefs = this.prefs.parsePrefsSnapshot(project.prefsSnapshot);
    const plot = this.prefs.parsePlotSnapshot(project.plotSnapshot);
    const request = this.prefs.toGenerationRequest(prefs, plot, { seed: dto.seed });

    const startedAt = Date.now();
    const result = this.generator.generate(request);
    const elapsedMs = Date.now() - startedAt;

    const version = await this.prisma.designVersion.create({
      data: {
        projectId,
        versionNumber: 1,
        parentId: null,
        plotSnapshot: project.plotSnapshot as Prisma.InputJsonValue,
        prefsSnapshot: project.prefsSnapshot as Prisma.InputJsonValue,
        changeRequest: Prisma.JsonNull,
        layout: result.layout as unknown as Prisma.InputJsonValue,
        metrics: result.layout.metrics as unknown as Prisma.InputJsonValue,
        diagnostics: { elapsedMs } as unknown as Prisma.InputJsonValue,
        seed: dto.seed ?? null,
      },
    });
    return this.toView(version);
  }

  async listDesigns(projectId: string) {
    await this.loadProject(projectId);
    const versions = await this.prisma.designVersion.findMany({
      where: { projectId },
      orderBy: { versionNumber: 'asc' },
      select: {
        id: true,
        versionNumber: true,
        parentId: true,
        status: true,
        metrics: true,
        diagnostics: true,
        createdAt: true,
      },
    });
    return versions;
  }

  async getDesign(projectId: string, versionNumber: number): Promise<DesignView> {
    const version = await this.prisma.designVersion.findUnique({
      where: { projectId_versionNumber: { projectId, versionNumber } },
    });
    if (!version) {
      throw new ResourceNotFoundError(
        `Design version ${versionNumber} not found for project ${projectId}`,
      );
    }
    return this.toView(version);
  }

  async createIteration(
    projectId: string,
    parentVersionNumber: number,
    dto: CreateIterationDto,
  ): Promise<DesignView> {
    const project = await this.loadProject(projectId);
    const parent = await this.prisma.designVersion.findUnique({
      where: {
        projectId_versionNumber: { projectId, versionNumber: parentVersionNumber },
      },
    });
    if (!parent) {
      throw new ResourceNotFoundError(
        `Design version ${parentVersionNumber} not found for project ${projectId}`,
      );
    }

    const changeRequest = this.prefs.parseChangeRequest(dto.changeRequest);
    const prefs = this.prefs.parsePrefsSnapshot(project.prefsSnapshot);
    const plot = this.prefs.parsePlotSnapshot(project.plotSnapshot);
    const request = this.prefs.toGenerationRequest(prefs, plot, {
      seed: dto.seed,
      parent: parent.layout as unknown as Layout,
      changeRequest,
    });

    const lastVersion = await this.prisma.designVersion.findFirst({
      where: { projectId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
    const nextVersionNumber = (lastVersion?.versionNumber ?? parentVersionNumber) + 1;

    const startedAt = Date.now();
    const result = this.generator.generate(request);
    const elapsedMs = Date.now() - startedAt;

    const version = await this.prisma.designVersion.create({
      data: {
        projectId,
        versionNumber: nextVersionNumber,
        parentId: parent.id,
        plotSnapshot: project.plotSnapshot as Prisma.InputJsonValue,
        prefsSnapshot: project.prefsSnapshot as Prisma.InputJsonValue,
        changeRequest: changeRequest as unknown as Prisma.InputJsonValue,
        layout: result.layout as unknown as Prisma.InputJsonValue,
        metrics: result.layout.metrics as unknown as Prisma.InputJsonValue,
        diagnostics: { elapsedMs } as unknown as Prisma.InputJsonValue,
        seed: dto.seed ?? null,
      },
    });
    return this.toView(version);
  }

  private async loadProject(projectId: string): Promise<{
    id: string;
    plotSnapshot: unknown;
    prefsSnapshot: unknown;
  }> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, plotSnapshot: true, prefsSnapshot: true },
    });
    if (!project) {
      throw new ResourceNotFoundError(`Project ${projectId} not found`);
    }
    return project;
  }

  private toView(version: {
    id: string;
    projectId: string;
    versionNumber: number;
    parentId: string | null;
    status: string;
    changeRequest: unknown;
    layout: unknown;
    metrics: unknown;
    diagnostics: unknown;
    seed: number | null;
    createdAt: Date;
  }): DesignView {
    return {
      id: version.id,
      projectId: version.projectId,
      versionNumber: version.versionNumber,
      parentId: version.parentId,
      status: version.status,
      changeRequest: version.changeRequest,
      layout: version.layout as Layout,
      metrics: version.metrics,
      diagnostics: version.diagnostics,
      seed: version.seed,
      createdAt: version.createdAt,
    };
  }
}
