import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { CartsService } from './carts.service';

@Controller('carts')
export class CartsController {
  constructor(private readonly cartService: CartsService) {}

  @Post()
  async create(@Body() body: { items: { product_id: number; qty: number }[] }) {
    const cart = await this.cartService.createCart(body.items);
    return { id: cart.id, message: 'Cart created' };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { items: { product_id: number; qty: number }[] },
  ) {
    console.log(body);
    console.log(id);
    return await this.cartService.updateCart(Number(id), body.items);
  }
}
