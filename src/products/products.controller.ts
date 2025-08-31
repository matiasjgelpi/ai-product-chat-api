import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';

import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ProductsService } from './products.service';
import { ProductFiltersDto } from './product-filter.dto';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);
  constructor(private productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all products with optional filters' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search query for name/description',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by category',
  })
  @ApiQuery({
    name: 'min_price',
    required: false,
    description: 'Minimum price filter',
  })
  @ApiQuery({
    name: 'max_price',
    required: false,
    description: 'Maximum price filter',
  })
  @ApiQuery({
    name: 'in_stock',
    required: false,
    description: 'Filter products in stock',
  })
  async findAll(@Query() query: ProductFiltersDto) {
    try {
      const { ...filters } = query;

      // Si hay parámetro de búsqueda 'q', usar búsqueda por texto

      if (Object.keys(filters).length > 0) {
        const cleanFilters = this.cleanFilters(filters);
        const products = await this.productsService.getProducts(cleanFilters);
        return {
          success: true,
          data: products,
          count: products?.length || 0,
          filters: cleanFilters,
        };
      }

      // Si no hay filtros, obtener todos
      const products = await this.productsService.getProducts();
      return {
        success: true,
        data: products,
        count: products?.length || 0,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Error retrieving products',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private cleanFilters(filters: Record<string, any>): Record<string, any> {
    const cleaned = {};

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        // Conversión de tipos para filtros especiales
        if (key === 'min_price' || key === 'max_price') {
          const numValue = parseFloat(value as string);
          if (!isNaN(numValue)) {
            // Para rangos de precio, necesitarás lógica especial en el service
            cleaned[key] = numValue;
          }
        } else if (key === 'in_stock') {
          // Convertir a boolean para filtro de stock
          cleaned['stock'] = value === 'true' ? { gt: 0 } : { eq: 0 };
        } else {
          cleaned[key] = value;
        }
      }
    }

    return cleaned;
  }
  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product found' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    try {
      const product = await this.productsService.findById(id);

      if (!product) {
        throw new HttpException(
          {
            success: false,
            message: `Product with ID ${id} not found`,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: product,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: 'Error retrieving product',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
