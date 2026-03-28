import { IsInt, IsNumber, IsString, Min } from 'class-validator';

export class UpsertServiceItemDto {
  @IsString()
  description: string;

  @IsInt()
  @Min(1)
  qty: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unit_price: number;
}
