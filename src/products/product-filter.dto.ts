import {
  IsOptional,
  IsString,
  IsNumberString,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ProductFiltersDto {
  @ApiPropertyOptional({
    description: 'Search query for product name or description',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Filter by category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Minimum price' })
  @IsOptional()
  @IsNumberString()
  min_price?: string;

  @ApiPropertyOptional({ description: 'Maximum price' })
  @IsOptional()
  @IsNumberString()
  max_price?: string;

  @ApiPropertyOptional({ description: 'Filter products in stock only' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  in_stock?: boolean;

  @ApiPropertyOptional({ description: 'Filter by brand' })
  @IsOptional()
  @IsString()
  brand?: string;
}
