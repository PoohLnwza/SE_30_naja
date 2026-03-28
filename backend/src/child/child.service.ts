import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChildDto } from './dto/create-child.dto';

type AuthUser = {
  user_id: number;
  user_type: 'staff' | 'parent';
  staffRole?: string | null;
  roleNames?: string[];
};

@Injectable()
export class ChildService {
  constructor(private readonly prisma: PrismaService) {}

  async createChild(user: AuthUser, dto: CreateChildDto) {
    if (user.user_type !== 'staff') {
      throw new ForbiddenException('Staff access only');
    }

    return this.prisma.child.create({
      data: {
        first_name: dto.first_name,
        last_name: dto.last_name,
        birth_date: dto.birth_date ? new Date(dto.birth_date) : null,
      },
    });
  }

  async getChildren(user: AuthUser) {
    if (user.user_type !== 'staff') {
      throw new ForbiddenException('Staff access only');
    }

    return this.prisma.child.findMany({
      where: { deleted_at: null },
      select: {
        child_id: true,
        first_name: true,
        last_name: true,
        birth_date: true,
        _count: { select: { child_parent: true } },
      },
      orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
    });
  }
}
