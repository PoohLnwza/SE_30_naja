import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreatePaymentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  invoiceId: number;

  @IsOptional()
  @IsString()
  slipImage?: string;
}
