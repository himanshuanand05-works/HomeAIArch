import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictError, ResourceNotFoundError } from '../../common/errors/domain-errors';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictError(`User with email ${dto.email} already exists`);
    }
    const user = await this.prisma.user.create({
      data: { email: dto.email, name: dto.name },
    });
    return this.toPublic(user);
  }

  async list() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return users.map((user) => this.toPublic(user));
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new ResourceNotFoundError(`User ${id} not found`);
    }
    return this.toPublic(user);
  }

  async deactivate(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new ResourceNotFoundError(`User ${id} not found`);
    }
    await this.prisma.user.update({
      where: { id },
      data: { status: 'DEACTIVATED' },
    });
  }

  private toPublic(user: {
    id: string;
    email: string;
    name: string;
    status: string;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      createdAt: user.createdAt,
    };
  }
}
