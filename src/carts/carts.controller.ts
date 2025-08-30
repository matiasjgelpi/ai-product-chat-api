import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CartsService } from './carts.service';
import { CreateCartDto, UpdateCartDto } from './dto/cart.dto';

@ApiTags('carts')
@Controller('carts')
export class CartsController {
  constructor(private readonly cartService: CartsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new cart',
    description: 'Creates a new cart with the specified items',
  })
  @ApiBody({ type: CreateCartDto })
  @ApiResponse({
    status: 201,
    description: 'Cart created successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        message: 'Cart created',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 404,
    description: 'One or more products not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async create(@Body() createCartDto: CreateCartDto) {
    try {
      const cart = await this.cartService.createCart(createCartDto.items);
      return {
        id: cart.id,
        message: 'Cart created',
      };
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new HttpException(
          {
            success: false,
            message: 'One or more products not found',
            error: error.message,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      throw new HttpException(
        {
          success: false,
          message: 'Error creating cart',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update cart items',
    description:
      'Updates the items in an existing cart. Replaces all current items.',
  })
  @ApiParam({
    name: 'id',
    description: 'Cart ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateCartDto })
  @ApiResponse({
    status: 200,
    description: 'Cart updated successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        items: [
          {
            id: 1,
            cart_id: '123e4567-e89b-12d3-a456-426614174000',
            product_id: 1,
            qty: 3,
            product: {
              id: 1,
              name: 'Product Name',
              price: 99.99,
            },
          },
        ],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 404,
    description: 'Cart not found or product not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async update(@Param('id') id: string, @Body() updateCartDto: UpdateCartDto) {
    try {
      return await this.cartService.updateCart(Number(id), updateCartDto.items);
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new HttpException(
          {
            success: false,
            message: 'Cart or product not found',
            error: error.message,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      throw new HttpException(
        {
          success: false,
          message: 'Error updating cart',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
