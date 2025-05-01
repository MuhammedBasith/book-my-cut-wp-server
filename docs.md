
# updates

1. **fixed the session mess**
    
    - no more duplicate sessions when someone says hi multiple times
        
    - sessions now reset instead of creating new ones
        
    - old sessions auto-cleanup after 24hrs
        
2. **loyalty points system**
    
    - added points for each service
        
    - points only get awarded after payment confirmation
        
    - receptionist can mark bookings as paid
        
    - customers can check their points through whatsapp
        
3. **mongodb integration**
    
    - moved everything from in-memory to mongodb
        
    - proper schemas and indexes for better performance
        
    - storing booking confirmations with message ids
        
4. **time slot improvements**
    
    - smart time slot filtering for today's bookings
        
    - shows only future slots based on IST timezone
        
    - properly handles 30-min intervals
        

---

# api docs

for now we're using `salon_id=1` since we're starting with a single salon.

## bookings

### get all bookings

```
GET /api/v1/salon/1/bookings
```

gets all bookings with customer and service details. useful for the receptionist dashboard.

#### sample response:

```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "customerId": "507f1f77bcf86cd799439012",
    "serviceId": "507f1f77bcf86cd799439013",
    "status": "CONFIRMED",
    "paymentStatus": "PENDING",
    "appointmentDate": "2025-05-01T10:30:00.000Z",
    "appointmentTime": "10:30 AM",
    "bookingReference": "BMC-89ab3-XYZ12",
    "loyaltyPointsAwarded": false,
    "confirmationMessageId": "wamid.1234567890",
    "customer": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "John Doe",
      "phoneNumber": "919876543210",
      "loyaltyPoints": 100
    },
    "service": {
      "_id": "507f1f77bcf86cd799439013",
      "title": "Mens Haircut",
      "price": 300,
      "duration": 30,
      "loyaltyPoints": 30
    }
  }
]
```

---

### get today's bookings

```
GET /api/v1/salon/1/bookings/today
```

shows only today's appointments. perfect for daily planning.

#### sample response:

same as above, filtered for today's date

---

### update booking status

```
PATCH /api/v1/bookings/:bookingId/status
```

used when receptionist needs to:

- mark appointment as completed
    
- confirm payment
    
- handle cancellations
    

#### request body:

```json
{
  "status": "COMPLETED", // CONFIRMED, CANCELLED, COMPLETED
  "paymentStatus": "PAID" // PENDING, PAID
}
```

#### sample response:

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "status": "COMPLETED",
  "paymentStatus": "PAID",
  "loyaltyPointsAwarded": true,
  "updatedAt": "2025-05-01T11:30:00.000Z"
}
```

---

## services

### get all services

```
GET /api/v1/salon/1/services
```

lists all salon services with prices and loyalty points

#### sample response:

```json
[
  {
    "_id": "507f1f77bcf86cd799439013",
    "category": "HAIR",
    "serviceId": "haircut_men",
    "title": "Mens Haircut",
    "description": "Professional haircut for men",
    "duration": 30,
    "price": 300,
    "loyaltyPoints": 30,
    "isActive": true
  }
]
```

---

### update service

```
PATCH /api/v1/services/:serviceId
```

update service details like price, points, etc.

#### request body:

```json
{
  "price": 350,
  "loyaltyPoints": 35,
  "description": "Updated description"
}
```

#### sample response:

```json
{
  "_id": "507f1f77bcf86cd799439013",
  "price": 350,
  "loyaltyPoints": 35,
  "description": "Updated description",
  "updatedAt": "2025-05-01T11:30:00.000Z"
}
```

---

### add new service

```
POST /api/v1/salon/1/services
```

add a new service to the catalog

#### request body:

```json
{
  "category": "HAIR",
  "serviceId": "beard_trim",
  "title": "Beard Trim",
  "description": "Professional beard trimming",
  "duration": 15,
  "price": 150,
  "loyaltyPoints": 15
}
```

#### sample response:

```json
{
  "_id": "507f1f77bcf86cd799439014",
  "category": "HAIR",
  "serviceId": "beard_trim",
  "title": "Beard Trim",
  "description": "Professional beard trimming",
  "duration": 15,
  "price": 150,
  "loyaltyPoints": 15,
  "isActive": true,
  "createdAt": "2025-05-01T11:30:00.000Z",
  "updatedAt": "2025-05-01T11:30:00.000Z"
}
```

---

## customers

### get all customers

```
GET /api/v1/salon/1/customers
```

list all customers with their points and visit history

#### sample response:

```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "phoneNumber": "919876543210",
    "name": "John Doe",
    "loyaltyPoints": 100,
    "lastVisit": "2025-05-01T10:30:00.000Z"
  }
]
```

---

## error responses

all endpoints return error responses in this format:

```json
{
  "status": "error",
  "message": "Detailed error message",
  "code": "ERROR_CODE"
}
```

### common error codes:

- `TOKEN_EXPIRED`: WhatsApp API token has expired
    
- `INVALID_TOKEN`: WhatsApp API token is invalid
    
- `NOT_FOUND`: Requested resource not found
    
- `VALIDATION_ERROR`: Invalid request data
    
- `DATABASE_ERROR`: Database operation failed
    

---

# todo / future improvements

1. **multi-salon support**
    
    - proper salon management system
        
    - each salon gets their own:
        
        - service catalog
            
        - pricing
            
        - working hours
            
        - staff management
            
2. **role based access**
    
    - salon owner dashboard
        
    - receptionist portal
        
    - staff scheduling
        
    - different access levels for apis
        
3. **appointment improvements**
    
    - staff assignment
        
    - block booking for VIP customers
        
    - waiting list
        
    - automatic reminders
        
    - reschedule requests through whatsapp
        
4. **loyalty system upgrades**
    
    - point expiry
        
    - redemption system
        
    - special offers
        
    - birthday rewards
        
    - referral points
        
5. **analytics & reporting**
    
    - daily/weekly/monthly reports
        
    - revenue tracking
        
    - popular services
        
    - customer retention stats
        
    - peak hours analysis
        
6. **customer features**
    
    - booking history view
        
    - favorite services
        
    - preferred staff
        
    - rating system
        
    - feedback collection
        
7. **operations**
    
    - inventory management
        
    - staff attendance
        
    - commission calculation
        
    - expense tracking
        

---
