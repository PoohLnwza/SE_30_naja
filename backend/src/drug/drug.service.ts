import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type AuthUser = {
  user_id: number;
  user_type: 'staff' | 'parent';
  staffRole?: string | null;
  roleNames?: string[];
};

@Injectable()
export class DrugService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.drug.findMany({
      orderBy: {
        drug_id: 'asc',
      },
    });
  }

  async create(
    user: AuthUser,
    data: { name: string; dose?: string; unit_price: number },
  ) {
    this.ensureAdmin(user);

    const name = data.name?.trim();
    const dose = data.dose?.trim() || null;
    const unitPrice = Number(data.unit_price);

    if (!name) {
      throw new BadRequestException('Drug name is required');
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new BadRequestException('Drug price must be zero or greater');
    }

    return this.prisma.drug.create({
      data: {
        name,
        dose,
        unit_price: unitPrice,
      },
    });
  }

  private ensureAdmin(user: AuthUser) {
    if (user.user_type !== 'staff') {
      throw new ForbiddenException('Staff access required');
    }

    const roles = new Set<string>([
      ...(user.staffRole ? [user.staffRole] : []),
      ...(user.roleNames ?? []),
    ]);

    if (!roles.has('admin')) {
      throw new ForbiddenException('Admin access required');
    }
  }
}
