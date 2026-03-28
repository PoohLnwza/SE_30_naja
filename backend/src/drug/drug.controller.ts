import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { DrugService } from './drug.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('drug')
export class DrugController {
  constructor(private readonly drugService: DrugService) {}

  @Get()
  findAll() {
    return this.drugService.findAll();
  }

  @Post()
  create(
    @Request() req: any,
    @Body() body: { name: string; dose?: string; unit_price: number },
  ) {
    return this.drugService.create(req.user, body);
  }
}
