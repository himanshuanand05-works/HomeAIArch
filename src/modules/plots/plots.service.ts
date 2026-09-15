import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictError, ResourceNotFoundError } from '../../common/errors/domain-errors';
import { toMillimetres, LengthUnit } from '../../common/util/units';
import { CreatePlotDto } from './dto/create-plot.dto';
import { UpdatePlotDto } from './dto/update-plot.dto';

export interface PlotView {
  id: string;
  ownerId: string;
  widthMm: number;
  depthMm: number;
  unit: LengthUnit;
  widthRaw: number;
  depthRaw: number;
  openSides: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PlotsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePlotDto): Promise<PlotView> {
    const widthMm = toMillimetres(dto.width, dto.unit);
    const depthMm = toMillimetres(dto.depth, dto.unit);

    const duplicate = await this.prisma.plot.findUnique({
      where: {
        ownerId_widthMm_depthMm: {
          ownerId: dto.ownerId,
          widthMm,
          depthMm,
        },
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictError(`Owner already has a ${dto.width}x${dto.depth} ${dto.unit} plot`);
    }

    const plot = await this.prisma.plot.create({
      data: {
        ownerId: dto.ownerId,
        widthMm,
        depthMm,
        unit: dto.unit,
        widthRaw: dto.width,
        depthRaw: dto.depth,
        openSides: dto.openSides,
      },
    });
    return this.toView(plot);
  }

  async listByOwner(ownerId: string): Promise<PlotView[]> {
    const plots = await this.prisma.plot.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'asc' },
    });
    return plots.map((plot) => this.toView(plot));
  }

  async findById(id: string): Promise<PlotView> {
    const plot = await this.prisma.plot.findUnique({ where: { id } });
    if (!plot) {
      throw new ResourceNotFoundError(`Plot ${id} not found`);
    }
    return this.toView(plot);
  }

  async update(id: string, dto: UpdatePlotDto): Promise<PlotView> {
    const existing = await this.findById(id);
    const unit = dto.unit ?? existing.unit;
    const width = dto.width ?? existing.widthRaw;
    const depth = dto.depth ?? existing.depthRaw;
    const plot = await this.prisma.plot.update({
      where: { id },
      data: {
        widthMm: toMillimetres(width, unit),
        depthMm: toMillimetres(depth, unit),
        widthRaw: width,
        depthRaw: depth,
        unit,
        openSides: dto.openSides ?? existing.openSides,
      },
    });
    return this.toView(plot);
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.prisma.plot.delete({ where: { id } });
  }

  private toView(plot: {
    id: string;
    ownerId: string;
    widthMm: number;
    depthMm: number;
    unit: LengthUnit;
    widthRaw: number;
    depthRaw: number;
    openSides: number;
    createdAt: Date;
    updatedAt: Date;
  }): PlotView {
    return {
      id: plot.id,
      ownerId: plot.ownerId,
      widthMm: plot.widthMm,
      depthMm: plot.depthMm,
      unit: plot.unit,
      widthRaw: plot.widthRaw,
      depthRaw: plot.depthRaw,
      openSides: plot.openSides,
      createdAt: plot.createdAt,
      updatedAt: plot.updatedAt,
    };
  }
}
