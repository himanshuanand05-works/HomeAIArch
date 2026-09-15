import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { LengthUnit } from '../../../common/util/units';

export class UpdatePlotDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? Number(value) : value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(1000)
  width?: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? Number(value) : value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(1000)
  depth?: number;

  @IsOptional()
  @IsEnum(['M', 'FT'])
  unit?: LengthUnit;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  openSides?: number;
}
