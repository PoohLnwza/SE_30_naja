import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AssessmentService {
  constructor(private prisma: PrismaService) {}

  // CREATE
  create(data: { name: string; created_by: number }) {
    return this.prisma.assessment.create({
      data,
    });
  }

  // READ ALL
  findAll() {
    return this.prisma.assessment.findMany();
  }

  // READ ONE
  findOne(id: number) {
    return this.prisma.assessment.findUnique({
      where: { assessment_id: id },
    });
  }

  // UPDATE
  update(id: number, data: { name?: string }) {
    return this.prisma.assessment.update({
      where: { assessment_id: id },
      data,
    });
  }

  // DELETE
  remove(id: number) {
    return this.prisma.assessment.delete({
      where: { assessment_id: id },
    });
  }

  // GET FULL ASSESSMENT (question + choice)
  findFull(id: number) {
    return this.prisma.assessment.findUnique({
      where: { assessment_id: id },
      include: {
        question: {
          orderBy: { question_id: 'asc' },
          include: {
            choice: {
              orderBy: { choice_id: 'asc' },
            },
          },
        },
      },
    });
  }
}
