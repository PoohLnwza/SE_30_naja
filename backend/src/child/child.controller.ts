import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { ChildService } from './child.service';
import { CreateChildDto } from './dto/create-child.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('child')
export class ChildController {
  constructor(private readonly childService: ChildService) {}

  @Roles('admin', 'nurse', 'doctor', 'psychologist')
  @Post()
  createChild(@Request() req: any, @Body() dto: CreateChildDto) {
    return this.childService.createChild(req.user, dto);
  }

  @Roles('admin', 'nurse', 'doctor', 'psychologist')
  @Get()
  getChildren(@Request() req: any) {
    return this.childService.getChildren(req.user);
  }
}
