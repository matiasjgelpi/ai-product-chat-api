# 🛒 AI Shop Assistant – NestJS + WhatsApp API

Este proyecto implementa un asistente de compras inteligente con NestJS, que combina:

## 📦 Funcionalidades

- **Gestión de productos y carritos** (crear, actualizar, eliminar)
- **🤖 Agente conversacional con IA** que interpreta mensajes del usuario
- **💬 Integración con WhatsApp Cloud API** para interactuar directamente con clientes

# Instalar dependencias

npm install

# Levantar el servidor en desarrollo

npm run start:dev

# Levantar en producción

npm run build && npm run start:prod

El servidor corre por defecto en:
👉 http://localhost:3005/

## 📌 Endpoints principales

### 🛍️ Productos

- **`GET /products`** → Listar productos
- **`GET /products/:id`** → Obtener detalle de un producto

### 🛒 Carritos

- **`POST /carts`** → Crear carrito
- **`PATCH /carts/:id`** → Actualizar un carrito existente
- **`DELETE /carts/:id`** → Eliminar un carrito

### 💬 Chat / IA

- **`POST /chat`**  
  Procesa un mensaje del usuario y devuelve la respuesta generada por el agente IA

- **`GET /chat/webhook`**  
  Verificación del webhook de WhatsApp con el `VERIFY_TOKEN`

- **`POST /chat/webhook`**  
  Recepción de mensajes de WhatsApp → se procesan con el agente y se responde vía Cloud API
