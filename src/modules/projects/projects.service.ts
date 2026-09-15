import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ResourceNotFoundError } from '../../common/errors/domain-errors';
import { PrefsSnapshot, PlotSnapshot } from '../prefs/prefs.service';
import { ProfilesService } from '../profiles/profiles.service';
import { CreateProjectDto } from './dto/create-project.dto';

export interface ProjectView {
  id: string;
  ownerId: string;
  plotId: string;
  homeProfileId: string | null;
  name: string;
  plotSnapshot: PlotSnapshot;
  prefsSnapshot: PrefsSnapshot;
  status: string;
  versionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesService,
  ) {}

  async create(dto: CreateProjectDto): Promise<ProjectView> {
    const plot = await this.prisma.plot.findUnique({ where: { id: dto.plotId } });
    if (!plot) {
      throw new ResourceNotFoundError(`Plot ${dto.plotId} not found`);
    }

    const profile = await this.prisma.homeProfile.findUnique({
      where: { id: dto.homeProfileId },
    });
    if (!profile) {
      throw new ResourceNotFoundError(`HomeProfile ${dto.homeProfileId} not found`);
    }

    const plotSnapshot: PlotSnapshot = {
      widthMm: plot.widthMm,
      depthMm: plot.depthMm,
      widthRaw: plot.widthRaw,
      depthRaw: plot.depthRaw,
      unit: plot.unit,
      openSides: plot.openSides,
    };

    const prefsSnapshot = await this.profiles.snapshotFor(profile);

    const project = await this.prisma.project.create({
      data: {
        ownerId: dto.ownerId,
        plotId: plot.id,
        homeProfileId: profile.id,
        name: dto.name ?? `${plot.widthRaw}x${plot.depthRaw} ${plot.unit} home`,
        plotSnapshot: plotSnapshot as unknown as Prisma.InputJsonValue,
        prefsSnapshot: prefsSnapshot as unknown as Prisma.InputJsonValue,
      },
      include: { _count: { select: { versions: true } } },
    });
    return this.toView(project);
  }

  async listByOwner(ownerId: string): Promise<ProjectView[]> {
    const projects = await this.prisma.project.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { versions: true } } },
    });
    return projects.map((project) => this.toView(project));
  }

  async findById(id: string): Promise<ProjectView> {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { _count: { select: { versions: true } } },
    });
    if (!project) {
      throw new ResourceNotFoundError(`Project ${id} not found`);
    }
    return this.toView(project);
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.feedback.deleteMany({
        where: { designVersion: { projectId: id } },
      });
      await tx.designVersion.deleteMany({ where: { projectId: id } });
      await tx.project.delete({ where: { id } });
    });
  }

  private toView(project: {
    id: string;
    ownerId: string;
    plotId: string;
    homeProfileId: string | null;
    name: string;
    plotSnapshot: unknown;
    prefsSnapshot: unknown;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    _count?: { versions: number };
  }): ProjectView {
    return {
      id: project.id,
      ownerId: project.ownerId,
      plotId: project.plotId,
      homeProfileId: project.homeProfileId,
      name: project.name,
      plotSnapshot: project.plotSnapshot as PlotSnapshot,
      prefsSnapshot: project.prefsSnapshot as PrefsSnapshot,
      status: project.status,
      versionCount: project._count?.versions ?? 0,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}
