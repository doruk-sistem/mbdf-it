# Substances API Documentation

## Overview

The Substances API provides access to chemical substance data for the MBDF (Madde Bilgi Değişim Formatı) system. This API is used primarily in the room creation process where users need to select a substance for their MBDF room.

## Endpoint

```
GET /api/substances
```

## Authentication

This endpoint requires authentication. Users must be signed in with a valid Supabase session.

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Filter substances by name, CAS number, or EC number |
| `limit` | number | No | Number of items to return (default: 100) |
| `offset` | number | No | Number of items to skip for pagination (default: 0) |

## Response Format

### Success Response (200)

```typescript
{
  items: Substance[],
  total: number
}
```

### Substance Schema

```typescript
interface Substance {
  id: string;              // UUID
  name: string;            // Substance name
  description: string | null;    // Optional description
  cas_number: string | null;     // CAS registry number
  ec_number: string | null;      // EC number
  created_at: string;      // ISO datetime
  updated_at: string;      // ISO datetime
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "success": false
}
```

#### 500 Internal Server Error
```json
{
  "error": "Failed to fetch substances",
  "success": false
}
```

## Usage Examples

### Basic Request
```typescript
import { useSubstances } from '@/hooks/use-substances';

function MyComponent() {
  const { data, isLoading, error } = useSubstances();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading substances</div>;
  
  return (
    <div>
      {data?.items.map(substance => (
        <div key={substance.id}>
          <h3>{substance.name}</h3>
          {substance.cas_number && <p>CAS: {substance.cas_number}</p>}
          {substance.ec_number && <p>EC: {substance.ec_number}</p>}
        </div>
      ))}
    </div>
  );
}
```

### Search Request
```javascript
// Using fetch directly
const response = await fetch('/api/substances?search=benzene');
const data = await response.json();
```

### Pagination
```javascript
// Get second page with 50 items per page
const response = await fetch('/api/substances?limit=50&offset=50');
```

## Database Schema

The API reads from the `substance` table with the following structure:

```sql
create table public.substance (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  ec_number text,
  cas_number text,
  description text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

## Security

- Endpoint requires authenticated user
- Read-only access (no POST/PUT/DELETE operations)
- Data is filtered through RLS (Row Level Security) policies
- Input validation using Zod schemas

## Performance Considerations

- Results are cached for 10 minutes in the React Query cache
- Database queries use indexes on name, cas_number, and ec_number
- Search operations use case-insensitive LIKE queries
- Pagination limits are enforced to prevent large data transfers

## Related Files

- **API Route**: `app/api/substances/route.ts`
- **Hook**: `hooks/use-substances.ts`
- **Schema**: `lib/schemas/index.ts` (SubstanceSchema, SubstancesListResponseSchema)
- **Types**: `types/supabase.ts`
- **Usage**: `components/rooms/create-room-form.tsx`
