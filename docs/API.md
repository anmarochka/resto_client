# API документация (mock)

В проекте используется mock API через `src/shared/api/mockData.ts`. Сервис имитирует задержки и хранит часть данных в памяти, а схему зала — в `localStorage`.

## Типы данных

Схемы типов: `src/shared/api/types.ts`

Основные сущности:
- `Restaurant`
- `Table`
- `Booking`
- `FloorCategory`, `FloorPlanState`
- `AnalyticsSnapshot`, `AnalyticsEvent`

## Методы mockDataService

Файл: `src/shared/api/mockData.ts`

### Restaurants

- `getRestaurants(): Promise<Restaurant[]>`
- `getRestaurant(id: string): Promise<Restaurant | null>`

### Floor plan

- `getFloorPlan(restaurantId: string): Promise<Table[]>`
- `getFloorPlanState(restaurantId: string): Promise<FloorPlanState>`
- `saveFloorPlanState(restaurantId: string, state: FloorPlanState): Promise<void>`
- `getFloorCategories(restaurantId: string): Promise<FloorCategory[]>`
- `updateTableStatus(restaurantId: string, tableId: string, status: Table["status"]): Promise<void>`

Хранение схемы зала:
- ключ `localStorage`: `rb_floorplan:<restaurantId>`

### Bookings

- `getBookings(userId?: number): Promise<Booking[]>`
- `createBooking(data: Omit<Booking, "id" | "createdAt">): Promise<Booking>`
- `cancelBooking(id: string): Promise<boolean>`
- `updateBookingStatus(id: string, status: Booking["status"]): Promise<boolean>`

### Analytics

- `getAnalyticsSnapshot(restaurantId: string): Promise<AnalyticsSnapshot>`

События аналитики:
- генерируются при `createBooking/cancelBooking/updateBookingStatus`
- часть событий “seed” добавляется для демо сразу при старте.

