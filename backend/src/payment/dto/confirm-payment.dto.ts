import { IsIn } from 'class-validator';

export class ConfirmPaymentDto {
  @IsIn(['confirmed', 'rejected'])
  action: 'confirmed' | 'rejected';
}
