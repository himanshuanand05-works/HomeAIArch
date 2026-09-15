import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsUUID, Max, Min } from 'class-validator';
import { LengthUnit } from '../../../common/util/units';

export class CreatePlotDto {
  @IsUUID()
  ownerId!: string;

  @Transform(({ value }) => (typeof value === 'string' ? Number(value) : value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(1000)
  width!: number;

  @Transform(({ value }) => (typeof value === 'string' ? Number(value) : value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(1000)
  depth!: number;

  @IsEnum(['M', 'FT'])
  unit: LengthUnit = 'M';

  @IsInt()
  @Min(1)
  @Max(4)
  openSides: number = 3;
}
