import { Controller, Get, Post, Body, Delete, Param, Patch } from '@nestjs/common';
import { AssessmentService } from './assessment.service';

@Controller('assessment')
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}

  @Post()
  create(@Body() body) {
    return this.assessmentService.create(body);
  }

  @Get()
  findAll() {
    return this.assessmentService.findAll();
  }

  @Get(':id/full')
  findFull(@Param('id') id: string) {
    return this.assessmentService.findFull(Number(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body) {
    return this.assessmentService.update(Number(id), body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assessmentService.remove(Number(id));
  }
}
