import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ResourceNotFoundError } from '../../common/errors/domain-errors';
import { PrefsService, TemplateSnapshot, PrefsSnapshot } from '../prefs/prefs.service';
import { CreateProfileDto, MandatoryDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { MandatoryRequirements } from '../prefs/prefs.service';

function toMandatoryPartial(
  dto: MandatoryDto | undefined,
): Partial<MandatoryRequirements> | undefined {
  if (!dto) {
    return undefined;
  }
  return {
    attachedBathrooms: dto.attachedBathrooms,
    indoorParking: dto.indoorParking
      ? { required: dto.indoorParking.required ?? false, cars: dto.indoorParking.cars ?? 0 }
      : undefined,
    outdoorParking: dto.outdoorParking
      ? { required: dto.outdoorParking.required ?? false, cars: dto.outdoorParking.cars ?? 0 }
      : undefined,
  };
}

export interface ProfileView {
  id: string;
  userId: string;
  name: string;
  templateId: string | null;
  floors: number;
  rooms: unknown;
  kitchen: unknown;
  bathConnectivity: unknown;
  mandatoryRequirements: unknown;
  maxCoverage: number | null;
  templateSnapshot: TemplateSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prefs: PrefsService,
  ) {}

  async create(dto: CreateProfileDto): Promise<ProfileView> {
    const template = await this.prisma.designTemplate.findUnique({
      where: { id: dto.templateId },
    });
    if (!template) {
      throw new ResourceNotFoundError(`DesignTemplate ${dto.templateId} not found`);
    }
    const templateSnapshot = this.prefs.parseTemplateSnapshot({
      slug: template.slug,
      name: template.name,
      region: template.region,
      wallNote: template.wallNote,
      wallThicknessM: template.wallThicknessM,
      circulationRatio: template.circulationRatio,
      doorWidthM: template.doorWidthM,
      staircase: template.staircase,
      roomDefaults: template.roomDefaults,
      kitchenDefaults: template.kitchenDefaults,
      bathDefaults: template.bathDefaults,
      mandatoryDefaults: template.mandatoryDefaults,
    });

    const snapshot = this.prefs.buildPrefsSnapshot(templateSnapshot, {
      floors: dto.floors ?? 1,
      rooms: (
        dto.rooms as {
          type: string;
          count?: number;
          minM2?: number;
          idealM2?: number;
          maxM2?: number;
          minSideM?: number;
        }[]
      ).map((room) => ({
        type: room.type,
        count: room.count ?? 1,
        minM2: room.minM2,
        idealM2: room.idealM2,
        maxM2: room.maxM2,
        minSideM: room.minSideM,
      })),
      kitchen: dto.kitchen as Parameters<PrefsService['buildPrefsSnapshot']>[1]['kitchen'],
      bathConnectivity: dto.bathConnectivity,
      mandatory: toMandatoryPartial(dto.mandatory),
      maxCoverage: dto.maxCoverage ?? null,
    });

    const profile = await this.prisma.homeProfile.create({
      data: {
        userId: dto.userId,
        name: dto.name,
        templateId: template.id,
        templateSnapshot: snapshot.template as unknown as Prisma.InputJsonValue,
        floors: snapshot.floors,
        rooms: snapshot.rooms as unknown as Prisma.InputJsonValue,
        kitchen: snapshot.kitchen as unknown as Prisma.InputJsonValue,
        bathConnectivity: snapshot.bathConnectivity as unknown as Prisma.InputJsonValue,
        mandatoryRequirements: snapshot.mandatory as unknown as Prisma.InputJsonValue,
        maxCoverage: snapshot.maxCoverage,
      },
    });
    return this.toView(profile);
  }

  async listByUser(userId: string): Promise<ProfileView[]> {
    const profiles = await this.prisma.homeProfile.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return profiles.map((profile) => this.toView(profile));
  }

  async findById(id: string): Promise<ProfileView> {
    const profile = await this.prisma.homeProfile.findUnique({ where: { id } });
    if (!profile) {
      throw new ResourceNotFoundError(`HomeProfile ${id} not found`);
    }
    return this.toView(profile);
  }

  async update(id: string, dto: UpdateProfileDto): Promise<ProfileView> {
    const existing = await this.findById(id);
    const templateSnapshot = this.prefs.parseTemplateSnapshot(existing.templateSnapshot);
    const previous = this.prefs.parseSnapshotFields(
      existing.rooms,
      existing.kitchen,
      existing.bathConnectivity,
      existing.mandatoryRequirements,
      existing.maxCoverage,
    );

    const snapshot = this.prefs.buildPrefsSnapshot(templateSnapshot, {
      floors: dto.floors ?? existing.floors,
      rooms: dto.rooms
        ? (dto.rooms as { type: string; count?: number }[]).map((room) => ({
            type: room.type,
            count: room.count ?? 1,
          }))
        : previous.rooms,
      kitchen: dto.kitchen ?? previous.kitchen,
      bathConnectivity: dto.bathConnectivity ?? previous.bathConnectivity,
      mandatory: toMandatoryPartial(dto.mandatory) ?? previous.mandatory,
      maxCoverage: dto.maxCoverage !== undefined ? dto.maxCoverage : previous.maxCoverage,
    });

    const profile = await this.prisma.homeProfile.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        floors: snapshot.floors,
        templateSnapshot: snapshot.template as unknown as Prisma.InputJsonValue,
        rooms: snapshot.rooms as unknown as Prisma.InputJsonValue,
        kitchen: snapshot.kitchen as unknown as Prisma.InputJsonValue,
        bathConnectivity: snapshot.bathConnectivity as unknown as Prisma.InputJsonValue,
        mandatoryRequirements: snapshot.mandatory as unknown as Prisma.InputJsonValue,
        maxCoverage: snapshot.maxCoverage,
      },
    });
    return this.toView(profile);
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.prisma.homeProfile.delete({ where: { id } });
  }

  async snapshotFor(profile: {
    id: string;
    floors: number;
    rooms: unknown;
    kitchen: unknown;
    bathConnectivity: unknown;
    mandatoryRequirements: unknown;
    maxCoverage: number | null;
    templateSnapshot: unknown;
  }): Promise<PrefsSnapshot> {
    const templateSnapshot = this.prefs.parseTemplateSnapshot(profile.templateSnapshot);
    const prefs = this.prefs.parseSnapshotFields(
      profile.rooms,
      profile.kitchen,
      profile.bathConnectivity,
      profile.mandatoryRequirements,
      profile.maxCoverage,
    );
    return this.prefs.buildPrefsSnapshot(templateSnapshot, {
      floors: profile.floors,
      rooms: prefs.rooms,
      kitchen: prefs.kitchen,
      bathConnectivity: prefs.bathConnectivity,
      mandatory: prefs.mandatory,
      maxCoverage: prefs.maxCoverage,
    });
  }

  private toView(profile: {
    id: string;
    userId: string;
    name: string;
    templateId: string | null;
    floors: number;
    rooms: unknown;
    kitchen: unknown;
    bathConnectivity: unknown;
    mandatoryRequirements: unknown;
    maxCoverage: number | null;
    templateSnapshot: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): ProfileView {
    return {
      id: profile.id,
      userId: profile.userId,
      name: profile.name,
      templateId: profile.templateId,
      floors: profile.floors,
      rooms: profile.rooms,
      kitchen: profile.kitchen,
      bathConnectivity: profile.bathConnectivity,
      mandatoryRequirements: profile.mandatoryRequirements,
      maxCoverage: profile.maxCoverage,
      templateSnapshot: this.prefs.parseTemplateSnapshot(profile.templateSnapshot),
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}
