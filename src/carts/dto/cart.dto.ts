// src/cart/dto/create-cart.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsPositive,
  ValidateNested,
} from 'class-validator';

export class CartItemDto {
  @ApiProperty({
    description: 'Product ID',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  product_id: number;

  @ApiProperty({
    description: 'Quantity of the product',
    example: 2,
  })
  @IsInt()
  @IsPositive()
  qty: number;
}

export class CreateCartDto {
  @ApiProperty({
    description: 'Array of items to add to cart',
    type: [CartItemDto],
    example: [
      { product_id: 1, qty: 2 },
      { product_id: 3, qty: 1 },
    ],
  })
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];
}

export class UpdateCartDto {
  @ApiProperty({
    description: 'Array of items to update in cart (replaces existing items)',
    type: [CartItemDto],
    example: [
      { product_id: 1, qty: 3 },
      { product_id: 2, qty: 1 },
    ],
  })
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];
}
