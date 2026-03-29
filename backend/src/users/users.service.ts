import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminStaffManagement() {
    const [users, roles] = await Promise.all([
      this.prisma.users.findMany({
        include: {
          staff: true,
          parent: true,
          user_roles: {
            include: {
              roles: {
                select: {
                  role_name: true,
                },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.roles.findMany({
        orderBy: { role_name: 'asc' },
      }),
    ]);

    return {
      users: users.map((user) => ({
        user_id: user.user_id,
        username: user.username,
        user_type: user.user_type,
        is_active: user.is_active,
        created_at: user.created_at,
        staff_profile: user.staff[0]
          ? {
              staff_id: user.staff[0].staff_id,
              first_name: user.staff[0].first_name,
              last_name: user.staff[0].last_name,
              role: this.toPublicRoleName(user.staff[0].role),
              status: user.staff[0].status,
            }
          : null,
        parent_profile: user.parent[0]
          ? {
              parent_id: user.parent[0].parent_id,
              first_name: user.parent[0].first_name,
              last_name: user.parent[0].last_name,
            }
          : null,
        roles: user.user_roles.map((item) =>
          this.toPublicRoleName(item.roles.role_name),
        ),
      })),
      roles: roles.map((role) => ({
        role_id: role.role_id,
        role_name: this.toPublicRoleName(role.role_name),
      })),
    };
  }

  async assignStaffRole(
    currentUser: {
      user_id: number;
      roleNames?: string[];
      staffRole?: string | null;
    },
    userId: number,
    roleName: string,
  ) {
    if (!this.hasRole(currentUser, ['admin'])) {
      throw new ForbiddenException('Admin role required');
    }

    const normalizedRole = this.normalizeStaffRole(roleName);
    if (!normalizedRole) {
      throw new BadRequestException('Unsupported staff role');
    }

    const user = await this.prisma.users.findUnique({
      where: { user_id: userId },
      include: {
        staff: true,
        user_roles: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const roleRecord = await this.prisma.roles.upsert({
      where: { role_name: roleName === 'doctor' ? 'doctor' : normalizedRole },
      update: {},
      create: { role_name: roleName === 'doctor' ? 'doctor' : normalizedRole },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      if (user.user_type !== 'staff') {
        await tx.users.update({
          where: { user_id: userId },
          data: { user_type: 'staff' },
        });
      }

      const existingParent = await tx.parent.findFirst({
        where: { user_id: userId },
        include: {
          child_parent: {
            select: {
              child_id: true,
            },
          },
        },
      });
      if (existingParent) {
        if (existingParent.child_parent.length > 0) {
          throw new BadRequestException(
            'Cannot promote a parent account that already has linked children',
          );
        }

        await tx.parent.delete({
          where: { parent_id: existingParent.parent_id },
        });
      }

      const existingStaff = await tx.staff.findFirst({
        where: { user_id: userId },
      });

      if (existingStaff) {
        await tx.staff.update({
          where: { staff_id: existingStaff.staff_id },
          data: {
            role: normalizedRole,
            status: 'active',
          },
        });
      } else {
        await tx.staff.create({
          data: {
            first_name: 'New',
            last_name: 'Staff',
            role: normalizedRole,
            status: 'active',
            user_id: userId,
          },
        });
      }

      const currentUserRoles = await tx.user_roles.findMany({
        where: { user_id: userId },
        include: {
          roles: true,
        },
      });

      const roleIdsToDelete = currentUserRoles
        .filter((item) =>
          [
            'doctor',
            'nurse',
            'psychologist',
            'admin',
            'psychiatrist',
            'parent',
          ].includes(item.roles.role_name),
        )
        .map((item) => ({ user_id: item.user_id, role_id: item.role_id }));

      for (const compositeKey of roleIdsToDelete) {
        await tx.user_roles.delete({
          where: {
            user_id_role_id: compositeKey,
          },
        });
      }

      await tx.user_roles.upsert({
        where: {
          user_id_role_id: {
            user_id: userId,
            role_id: roleRecord.role_id,
          },
        },
        update: {},
        create: {
          user_id: userId,
          role_id: roleRecord.role_id,
        },
      });

      return tx.users.findUnique({
        where: { user_id: userId },
        include: {
          staff: true,
          user_roles: {
            include: {
              roles: true,
            },
          },
        },
      });
    });

    return {
      user_id: result?.user_id,
      username: result?.username,
      staffRole: this.toPublicRoleName(result?.staff[0]?.role),
      roles:
        result?.user_roles.map((item) =>
          this.toPublicRoleName(item.roles.role_name),
        ) ?? [],
    };
  }

  async getStaffCommonDashboard(currentUser: {
    user_id: number;
    user_type: string;
    roleNames?: string[];
    staffRole?: string | null;
  }) {
    if (currentUser.user_type !== 'staff') {
      throw new ForbiddenException('Staff access required');
    }

    const today = this.startOfToday();
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const monthStart = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
    );

    const [
      totalSchedules,
      bookedSchedules,
      todayAppointments,
      allAppointments,
      totalStaff,
      totalParents,
      totalChildren,
      invoices,
      upcomingSchedules,
      recentAppointments,
    ] = await Promise.all([
      this.prisma.work_schedules.count(),
      this.prisma.work_schedules.count({ where: { slot_status: 'booked' } }),
      this.prisma.appointments.count({
        where: {
          work_schedules: {
            is: {
              work_date: { gte: today, lt: tomorrow },
            },
          },
          deleted_at: null,
        },
      }),
      this.prisma.appointments.groupBy({
        by: ['status'],
        _count: {
          status: true,
        },
      }),
      this.prisma.staff.count(),
      this.prisma.parent.count(),
      this.prisma.child.count(),
      this.prisma.invoice.findMany({
        where: {
          deleted_at: null,
        },
        select: {
          total_amount: true,
          visit: {
            select: {
              visit_date: true,
            },
          },
        },
      }),
      this.prisma.work_schedules.findMany({
        take: 8,
        include: {
          staff: {
            select: {
              first_name: true,
              last_name: true,
              role: true,
            },
          },
          appointments: {
            include: {
              child: {
                select: {
                  first_name: true,
                  last_name: true,
                },
              },
            },
          },
        },
        orderBy: [{ work_date: 'asc' }, { start_time: 'asc' }],
      }),
      this.prisma.appointments.findMany({
        take: 8,
        where: { deleted_at: null },
        include: {
          child: {
            select: {
              first_name: true,
              last_name: true,
            },
          },
          work_schedules: {
            include: {
              staff: {
                select: {
                  first_name: true,
                  last_name: true,
                  role: true,
                },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    const revenue = invoices.reduce(
      (acc, item) => {
        const amount = Number(item.total_amount ?? 0);
        acc.total += amount;

        if (item.visit?.visit_date && item.visit.visit_date >= monthStart) {
          acc.thisMonth += amount;
        }

        return acc;
      },
      { total: 0, thisMonth: 0 },
    );

    return {
      summary: {
        totalSchedules,
        bookedSchedules,
        availableSchedules: totalSchedules - bookedSchedules,
        todayAppointments,
        totalStaff,
        totalParents,
        totalChildren,
        revenue,
        appointmentStatus: allAppointments.map((item) => ({
          status: item.status,
          count: item._count.status,
        })),
      },
      upcomingSchedules: upcomingSchedules.map((schedule) => ({
        ...schedule,
        staff: schedule.staff
          ? {
              ...schedule.staff,
              role: this.toPublicRoleName(schedule.staff.role),
            }
          : null,
      })),
      recentAppointments,
    };
  }

  async createUserByStaff(
    currentUser: {
      user_id: number;
      user_type: string;
      roleNames?: string[];
      staffRole?: string | null;
    },
    dto: CreateUserDto,
  ) {
    if (currentUser.user_type !== 'staff') {
      throw new ForbiddenException('Staff access required');
    }

    if (dto.userType === 'staff' && !this.hasRole(currentUser, ['admin'])) {
      throw new ForbiddenException('Admin role required to create staff users');
    }

    if (dto.userType === 'parent' && dto.roleName) {
      throw new BadRequestException('Parent accounts cannot have a staff role');
    }

    const existingUser = await this.prisma.users.findUnique({
      where: { username: dto.username },
    });
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.users.create({
        data: {
          username: dto.username,
          password_hash: passwordHash,
          user_type: dto.userType,
        },
      });

      if (dto.userType === 'parent') {
        const parentRole = await tx.roles.upsert({
          where: { role_name: 'parent' },
          update: {},
          create: { role_name: 'parent' },
        });

        await tx.parent.create({
          data: {
            first_name: dto.firstName || 'New',
            last_name: dto.lastName || 'Parent',
            phone: dto.phone || '',
            user_id: user.user_id,
          },
        });

        await tx.user_roles.create({
          data: {
            user_id: user.user_id,
            role_id: parentRole.role_id,
          },
        });

        return {
          user_id: user.user_id,
          username: user.username,
          user_type: user.user_type,
          assignedRole: 'parent',
        };
      }

      const normalizedRole = this.normalizeStaffRole(dto.roleName || '');
      if (!normalizedRole) {
        throw new BadRequestException('Unsupported staff role');
      }

      const publicRole =
        this.toPublicRoleName(normalizedRole) || normalizedRole;
      const roleRecord = await tx.roles.upsert({
        where: { role_name: publicRole },
        update: {},
        create: { role_name: publicRole },
      });

      await tx.staff.create({
        data: {
          first_name: dto.firstName || 'New',
          last_name: dto.lastName || 'Staff',
          role: normalizedRole,
          status: 'active',
          user_id: user.user_id,
        },
      });

      await tx.user_roles.create({
        data: {
          user_id: user.user_id,
          role_id: roleRecord.role_id,
        },
      });

      return {
        user_id: user.user_id,
        username: user.username,
        user_type: user.user_type,
        assignedRole: publicRole,
      };
    });

    return {
      ...result,
      message: 'User created successfully',
    };
  }

  async getStaffRoleDashboard(
    currentUser: {
      user_id: number;
      user_type: string;
      roleNames?: string[];
      staffRole?: string | null;
    },
    roleName: string,
  ) {
    if (currentUser.user_type !== 'staff') {
      throw new ForbiddenException('Staff access required');
    }

    const publicRole = this.normalizePublicRole(roleName);
    if (!publicRole) {
      throw new BadRequestException('Unsupported dashboard role');
    }

    if (!this.hasRole(currentUser, ['admin', publicRole])) {
      throw new ForbiddenException('Role access denied');
    }

    const today = this.startOfToday();
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const staffRecord = await this.prisma.staff.findFirst({
      where: { user_id: currentUser.user_id },
      select: { staff_id: true },
    });

    const currentStaffId = staffRecord?.staff_id ?? -1;
    const internalRole = publicRole === 'doctor' ? 'psychiatrist' : publicRole;

    const [
      staffCount,
      todaySchedules,
      todayAppointments,
      ownAppointments,
      assessments,
      prescriptions,
    ] = await Promise.all([
      this.prisma.staff.count({
        where: { role: internalRole as any, status: 'active' },
      }),
      this.prisma.work_schedules.count({
        where: {
          staff: { role: internalRole as any },
          work_date: { gte: today, lt: tomorrow },
        },
      }),
      this.prisma.appointments.count({
        where: {
          deleted_at: null,
          work_schedules: {
            is: {
              work_date: { gte: today, lt: tomorrow },
              staff: { role: internalRole as any },
            },
          },
        },
      }),
      this.prisma.appointments.findMany({
        take: 8,
        where: {
          deleted_at: null,
          work_schedules: {
            is: {
              staff_id: currentStaffId,
            },
          },
        },
        include: {
          child: {
            select: {
              first_name: true,
              last_name: true,
            },
          },
          work_schedules: true,
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.assessment.count({
        where:
          publicRole === 'psychologist'
            ? { created_by: currentStaffId }
            : undefined,
      }),
      this.prisma.prescription.count({
        where:
          publicRole === 'doctor'
            ? {
                visit: {
                  is: {
                    appointments: {
                      is: {
                        work_schedules: {
                          is: {
                            staff_id: currentStaffId,
                          },
                        },
                      },
                    },
                  },
                },
              }
            : undefined,
      }),
    ]);

    return {
      role: publicRole,
      summary: {
        staffCount,
        todaySchedules,
        todayAppointments,
        ownAppointmentCount: ownAppointments.length,
        assessments,
        prescriptions,
      },
      ownAppointments,
    };
  }

  async getStaffReports(currentUser: {
    user_id: number;
    user_type: string;
    roleNames?: string[];
    staffRole?: string | null;
  }) {
    if (currentUser.user_type !== 'staff') {
      throw new ForbiddenException('Staff access required');
    }

    const [staff, parents, drugs, appointments, visits] = await Promise.all([
      this.prisma.staff.findMany({
        include: {
          users: {
            select: {
              user_id: true,
              username: true,
              is_active: true,
            },
          },
        },
        orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
      }),
      this.prisma.parent.findMany({
        where: { deleted_at: null },
        include: {
          users: {
            select: {
              user_id: true,
              username: true,
              is_active: true,
            },
          },
          child_parent: {
            include: {
              child: {
                select: {
                  child_id: true,
                  first_name: true,
                  last_name: true,
                  birth_date: true,
                },
              },
            },
          },
        },
        orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
      }),
      this.prisma.drug.findMany({
        orderBy: [{ name: 'asc' }, { dose: 'asc' }],
      }),
      this.prisma.appointments.findMany({
        where: { deleted_at: null },
        include: {
          child: {
            select: {
              child_id: true,
              first_name: true,
              last_name: true,
            },
          },
          booked_by: {
            select: {
              user_id: true,
              username: true,
              parent: {
                select: {
                  parent_id: true,
                  first_name: true,
                  last_name: true,
                },
              },
            },
          },
          room: {
            select: {
              room_id: true,
              room_name: true,
            },
          },
          work_schedules: {
            select: {
              schedule_id: true,
              work_date: true,
              start_time: true,
              end_time: true,
              slot_status: true,
              staff: {
                select: {
                  staff_id: true,
                  first_name: true,
                  last_name: true,
                  role: true,
                },
              },
            },
          },
        },
        orderBy: [{ created_at: 'desc' }],
      }),
      this.prisma.visit.findMany({
        where: { deleted_at: null },
        include: {
          appointments: {
            include: {
              child: {
                select: {
                  child_id: true,
                  first_name: true,
                  last_name: true,
                },
              },
              booked_by: {
                select: {
                  user_id: true,
                  username: true,
                  parent: {
                    select: {
                      parent_id: true,
                      first_name: true,
                      last_name: true,
                    },
                  },
                },
              },
              work_schedules: {
                include: {
                  staff: {
                    select: {
                      staff_id: true,
                      first_name: true,
                      last_name: true,
                      role: true,
                    },
                  },
                },
              },
            },
          },
          prescription: {
            include: {
              prescription_item: {
                include: {
                  drug: true,
                },
                orderBy: { prescription_item_id: 'asc' },
              },
            },
            orderBy: { prescription_id: 'asc' },
          },
          invoice: {
            where: { deleted_at: null },
            include: {
              invoice_item: {
                orderBy: { invoice_item_id: 'asc' },
              },
              payment: {
                orderBy: { payment_id: 'asc' },
              },
            },
            orderBy: { invoice_id: 'desc' },
          },
        },
        orderBy: [{ visit_date: 'desc' }, { visit_id: 'desc' }],
      }),
    ]);

    return {
      staff: staff.map((item) => ({
        staff_id: item.staff_id,
        username: item.users.username,
        first_name: item.first_name,
        last_name: item.last_name,
        role: this.toPublicRoleName(item.role),
        status: item.status,
        is_active: item.users.is_active,
      })),
      parents: parents.map((item) => ({
        parent_id: item.parent_id,
        username: item.users.username,
        first_name: item.first_name,
        last_name: item.last_name,
        phone: item.phone,
        is_active: item.users.is_active,
        children: item.child_parent
          .map((link) => link.child)
          .filter((child): child is NonNullable<typeof child> =>
            Boolean(child),
          ),
      })),
      drugs: drugs.map((item) => ({
        drug_id: item.drug_id,
        name: item.name,
        dose: item.dose,
        unit_price: item.unit_price,
      })),
      appointments: appointments.map((item) => ({
        appointment_id: item.appointment_id,
        status: item.status,
        approval_status: item.approval_status,
        created_at: item.created_at,
        patient: item.child,
        parent: item.booked_by?.parent?.[0]
          ? {
              parent_id: item.booked_by.parent[0].parent_id,
              first_name: item.booked_by.parent[0].first_name,
              last_name: item.booked_by.parent[0].last_name,
            }
          : null,
        room: item.room,
        schedule: item.work_schedules
          ? {
              schedule_id: item.work_schedules.schedule_id,
              work_date: item.work_schedules.work_date,
              start_time: item.work_schedules.start_time,
              end_time: item.work_schedules.end_time,
              slot_status: item.work_schedules.slot_status,
              staff: item.work_schedules.staff
                ? {
                    staff_id: item.work_schedules.staff.staff_id,
                    first_name: item.work_schedules.staff.first_name,
                    last_name: item.work_schedules.staff.last_name,
                    role: this.toPublicRoleName(item.work_schedules.staff.role),
                  }
                : null,
            }
          : null,
      })),
      visits: visits.map((visit) => {
        const prescriptionItems = visit.prescription.flatMap((prescription) =>
          prescription.prescription_item.map((item) => ({
            prescription_id: prescription.prescription_id,
            prescription_item_id: item.prescription_item_id,
            quantity: item.quantity,
            drug_name: item.drug?.name ?? null,
            drug_dose: item.drug?.dose ?? null,
          })),
        );
        const latestInvoice = visit.invoice[0] ?? null;

        return {
          visit_id: visit.visit_id,
          visit_date: visit.visit_date,
          appointment_id: visit.appointment_id,
          patient: visit.appointments?.child ?? null,
          parent: visit.appointments?.booked_by?.parent?.[0]
            ? {
                parent_id: visit.appointments.booked_by.parent[0].parent_id,
                first_name: visit.appointments.booked_by.parent[0].first_name,
                last_name: visit.appointments.booked_by.parent[0].last_name,
              }
            : null,
          staff: visit.appointments?.work_schedules?.staff
            ? {
                staff_id: visit.appointments.work_schedules.staff.staff_id,
                first_name: visit.appointments.work_schedules.staff.first_name,
                last_name: visit.appointments.work_schedules.staff.last_name,
                role: this.toPublicRoleName(
                  visit.appointments.work_schedules.staff.role,
                ),
              }
            : null,
          prescription_items: prescriptionItems,
          prescription_count: prescriptionItems.length,
          latest_invoice: latestInvoice
            ? {
                invoice_id: latestInvoice.invoice_id,
                total_amount: latestInvoice.total_amount,
                status: latestInvoice.status,
                item_count: latestInvoice.invoice_item.length,
                payment_count: latestInvoice.payment.length,
              }
            : null,
        };
      }),
    };
  }

  private hasRole(
    user: { roleNames?: string[]; staffRole?: string | null },
    roles: string[],
  ) {
    const roleSet = new Set<string>([
      ...(user.staffRole ? [user.staffRole] : []),
      ...(user.roleNames ?? []),
    ]);

    if (roleSet.has('admin')) {
      return true;
    }

    return roles.some((role) => {
      if (role === 'doctor') {
        return roleSet.has('doctor') || roleSet.has('psychiatrist');
      }

      return roleSet.has(role);
    });
  }

  private normalizeStaffRole(roleName: string) {
    if (roleName === 'doctor') {
      return 'psychiatrist';
    }

    if (['admin', 'nurse', 'psychologist', 'psychiatrist'].includes(roleName)) {
      return roleName;
    }

    return null;
  }

  private normalizePublicRole(roleName: string) {
    if (roleName === 'psychiatrist') {
      return 'doctor';
    }

    if (['doctor', 'nurse', 'psychologist', 'admin'].includes(roleName)) {
      return roleName;
    }

    return null;
  }

  private toPublicRoleName(roleName?: string | null) {
    if (!roleName) {
      return null;
    }

    return roleName === 'psychiatrist' ? 'doctor' : roleName;
  }

  private startOfToday() {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }
}
