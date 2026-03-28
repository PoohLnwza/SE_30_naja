import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentService } from './payment.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /** Parent submits a payment with slip image */
  @Post()
  createPayment(@Request() req: any, @Body() dto: CreatePaymentDto) {
    return this.paymentService.createPayment(req.user, dto);
  }

  /** Parent views their payment history */
  @Get('my-payments')
  getMyPayments(@Request() req: any) {
    return this.paymentService.getMyPayments(req.user);
  }

  /** Get payments for a specific invoice */
  @Get('invoice/:invoiceId')
  getByInvoice(@Param('invoiceId', ParseIntPipe) invoiceId: number) {
    return this.paymentService.getByInvoice(invoiceId);
  }

  /** Staff views pending payments waiting for confirmation */
  @Roles('admin', 'psychiatrist', 'psychologist', 'nurse')
  @Get('pending')
  getPendingPayments(@Request() req: any) {
    return this.paymentService.getPendingPayments(req.user);
  }

  /** Staff confirms or rejects a payment */
  @Roles('admin', 'psychiatrist', 'psychologist', 'nurse')
  @Patch(':id/verify')
  confirmPayment(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmPaymentDto,
  ) {
    return this.paymentService.confirmPayment(req.user, id, dto.action);
  }
}
