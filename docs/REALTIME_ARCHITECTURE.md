# Real-time Analytics Architecture

## Overview

This document describes the complete architecture of the real-time analytics system for the restaurant booking application, meeting the requirements for real-time data processing with target latency of < 1 second.

## System Architecture

### 1. INGESTION LAYER (Event Reception)

**Source of Events:**
- User actions: booking creation, cancellation, modification
- System events: booking confirmations, reminders, status changes
- Admin actions: manual status updates, table blocking

**Event Delivery:**
- REST API endpoint: `/api/events` (POST)
- WebSocket connections from frontend clients
- Telegram Bot webhook events

**Event Format:**
```typescript
interface BookingEvent {
  type: 'booking_created' | 'booking_cancelled' | 'booking_confirmed' | 'booking_completed'
  data: {
    bookingId: string
    restaurantId: string
    restaurantName: string
    tableId: string
    tableName: string
    userId: string
    date: string
    time: string
    guests: number
    zone: string
    status: string
  }
  timestamp: string
}
```

**Technologies:**
- Node.js WebSocket Server (ws library)
- Express REST API
- Message Queue: RabbitMQ/NATS for event distribution

### 2. PROCESSING LAYER (Real-time Processing)

**Event Processing Pipeline:**

1. **Validation & Authentication**
   - JWT token verification for API requests
   - Rate limiting per client (100 req/min)
   - Schema validation with Zod

2. **Real-time Aggregation**
   - Hourly booking counts: `Map<hour, count>`
   - Zone popularity: `Map<zone, count>`
   - Current occupancy: sum of active guest counts
   - Today's total bookings counter

3. **Windowed Metrics**
   - Last 1 hour: rolling window aggregation
   - Last 24 hours: daily statistics
   - Last 7 days: weekly trends

4. **Alert Generation**
   - High occupancy threshold (>90%)
   - Unusual cancellation rate (>20%)
   - No-show detection

**Processing Latency:**
- Target: < 500ms from event ingestion to client notification
- Measured: Event timestamp → Client receive timestamp
- Monitoring: Prometheus metrics exported

**Technologies:**
- In-memory processing in Node.js
- Stream processing for complex aggregations
- Time-based windows with sliding intervals

### 3. STORAGE/SERVING LAYER

**Hot Data (In-Memory):**
- Redis for current metrics
  - Key: `metrics:today` → Hash of today's stats
  - Key: `metrics:hourly:{hour}` → Booking count
  - Key: `metrics:zones:{zone}` → Zone popularity
  - TTL: 24 hours for daily metrics

**Historical Data:**
- TimescaleDB (PostgreSQL extension) for time-series data
  - Table: `booking_events` with hypertable on timestamp
  - Retention: 90 days
  - Continuous aggregates for hourly/daily rollups

**Cache Layer:**
- Redis cache for frequently accessed data
- Cache invalidation on new events
- TTL: 5 minutes for aggregated metrics

**Technologies:**
- Redis 7.x for in-memory storage
- TimescaleDB for time-series data
- PostgreSQL for relational data

### 4. DELIVERY LAYER (WebSocket Broadcast)

**WebSocket Server:**
- Port: 3001 (separate from Next.js)
- Protocol: WebSocket (ws://) with TLS upgrade (wss://)
- Max connections: 10,000 concurrent clients

**Message Types:**
```typescript
// Initial state when client connects
{
  type: 'initial_state',
  data: { metrics: RealtimeMetrics }
}

// Metrics update (every event or every 5 seconds)
{
  type: 'metrics_update',
  data: RealtimeMetrics
}

// Individual booking event
{
  type: 'booking_created' | 'booking_cancelled' | ...,
  data: BookingEventData
}
```

**Connection Management:**
- Heartbeat ping/pong every 30 seconds
- Auto-reconnect with exponential backoff
- Max reconnect attempts: 10
- Connection timeout: 60 seconds

**Technologies:**
- ws (WebSocket library for Node.js)
- Redis Pub/Sub for multi-instance coordination

## Data Flow Diagram

```
┌─────────────┐
│   User      │
│  Actions    │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  Booking API    │
│  (Next.js)      │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Events API     │
│  /api/events    │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Message Queue  │
│  (RabbitMQ)     │
└──────┬──────────┘
       │
       ▼
┌─────────────────────────┐
│  Event Processor        │
│  - Validation           │
│  - Aggregation          │
│  - Metrics Update       │
└──────┬──────────────────┘
       │
       ├─────────────────────┐
       ▼                     ▼
┌──────────────┐      ┌──────────────┐
│    Redis     │      │ TimescaleDB  │
│  (Hot Data)  │      │ (Historical) │
└──────┬───────┘      └──────────────┘
       │
       ▼
┌─────────────────┐
│  Redis Pub/Sub  │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ WebSocket Server│
│  (Multi-node)   │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Web Clients    │
│  (Dashboard)    │
└─────────────────┘
```

## Scaling Strategy

### Horizontal Scaling

1. **WebSocket Server Scaling:**
   - Deploy multiple WS server instances
   - Use Redis Pub/Sub for inter-instance communication
   - Sticky sessions via load balancer (Nginx/HAProxy)
   - Health checks on `/health` endpoint

2. **Event Processor Scaling:**
   - Multiple worker processes consuming from queue
   - Partitioning by restaurant_id for consistent routing
   - Auto-scaling based on queue depth

3. **Database Scaling:**
   - Redis Cluster for distributed cache
   - TimescaleDB read replicas for queries
   - Sharding by restaurant_id if needed

### Load Handling

**Normal Load (100 concurrent users):**
- Single WS server instance
- Single Redis instance
- Response time: < 200ms

**High Load (1000 concurrent users):**
- 3 WS server instances
- Redis Cluster (3 nodes)
- Response time: < 500ms

**Peak Load (5000+ concurrent users):**
- Auto-scale to 10+ WS instances
- Redis Cluster (6 nodes)
- CDN for static assets
- Response time: < 1s (acceptable degradation)

## Security Implementation

### Authentication & Authorization

1. **WebSocket Authentication:**
   - JWT token sent in initial connection message
   - Token validated against user database
   - Connection rejected if invalid
   - Token refresh mechanism every 15 minutes

2. **API Authentication:**
   - API key for internal services
   - JWT for user-initiated requests
   - Rate limiting per API key/user

3. **Access Control:**
   - Admin users: full access to all metrics
   - Restaurant owners: access to their restaurant only
   - Regular users: no access to analytics endpoints

### Data Privacy

1. **Personal Data Masking:**
   - User names masked in events: "Anna M." instead of "Anna Marachkina"
   - Phone numbers: last 4 digits only
   - Email addresses: hashed in events

2. **GDPR Compliance:**
   - Right to deletion: purge user data on request
   - Data minimization: only essential fields in events
   - Consent tracking: log user consent for analytics

3. **Encryption:**
   - TLS 1.3 for all connections
   - At-rest encryption for sensitive data in Redis
   - Encrypted backups

## Monitoring & Observability

### Metrics Collection

1. **System Metrics:**
   - WebSocket connections: active count, connection rate
   - Event throughput: events/second
   - Processing latency: p50, p95, p99
   - Error rate: % of failed events

2. **Business Metrics:**
   - Bookings per hour/day/week
   - Cancellation rate
   - Average occupancy
   - Popular time slots and zones

### Alerting

**Critical Alerts:**
- WebSocket server down
- Event processing stopped
- Database connection failed
- Error rate > 5%

**Warning Alerts:**
- Processing latency > 1s
- Redis memory > 80%
- Unusual cancellation rate

### Logging

**Event Logs:**
```json
{
  "timestamp": "2025-01-19T12:34:56.789Z",
  "level": "info",
  "type": "booking_created",
  "bookingId": "bkg_123",
  "restaurantId": "rst_456",
  "processingTime": 234,
  "source": "web_app"
}
```

**Retention:**
- Application logs: 30 days
- Event logs: 90 days
- Metrics: 1 year

## Target Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| Event ingestion → Client notification | < 500ms | End-to-end latency |
| WebSocket message delivery | < 100ms | Server → Client |
| Metrics aggregation | < 200ms | Event → Redis update |
| Dashboard update frequency | Every 1-5s | Configurable |
| System availability | 99.9% | Monthly uptime |
| Concurrent connections | 10,000+ | Load tested |

## Deployment

### Production Setup

1. **WebSocket Server:**
   ```bash
   # Separate Node.js server
   cd websocket-server
   npm install
   npm run start
   ```

2. **Redis:**
   ```bash
   docker run -d \
     --name redis \
     -p 6379:6379 \
     redis:7-alpine
   ```

3. **Message Queue:**
   ```bash
   docker run -d \
     --name rabbitmq \
     -p 5672:5672 \
     -p 15672:15672 \
     rabbitmq:3-management
   ```

4. **Environment Variables:**
   ```env
   WS_PORT=3001
   REDIS_URL=redis://localhost:6379
   RABBITMQ_URL=amqp://localhost:5672
   DATABASE_URL=postgresql://...
   JWT_SECRET=...
   ```

### Health Checks

- WebSocket: `GET /health` → 200 OK
- Events API: `GET /api/events` → 200 OK
- Redis: `PING` → PONG
- Database: `SELECT 1` → Success

## Testing Real-time System

### Manual Testing

1. Open admin dashboard
2. Verify "Connected" status
3. Create a booking via user interface
4. Watch metrics update within 1 second
5. Cancel booking and verify update

### Automated Testing

```typescript
// Load test with Artillery
artillery run load-test.yml

// WebSocket connection test
npm run test:websocket

// End-to-end latency test
npm run test:latency
```

## Future Enhancements

1. **Machine Learning:**
   - Predict peak hours
   - Optimize table assignments
   - Detect anomalies

2. **Advanced Analytics:**
   - Revenue forecasting
   - Customer segmentation
   - Churn prediction

3. **Multi-region:**
   - Global Redis cluster
   - Edge computing for low latency
   - Regional WebSocket servers

## Conclusion

This real-time analytics system provides sub-second latency for booking events, scalable architecture for thousands of concurrent users, comprehensive security and privacy controls, and meets all diploma project requirements for real-time data processing.
