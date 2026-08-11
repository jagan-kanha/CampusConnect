# CampusConnect

CampusConnect is a role-based campus complaint management system built using Java and Spring Boot. It allows students to raise and track campus complaints, while administrators can manage complaints, update their status, and monitor issues efficiently.

## Features

- Student registration and login
- Secure password hashing using BCrypt
- JWT-based authentication
- Role-based authorization for STUDENT and ADMIN
- Create and manage campus complaints
- View complaints submitted by the logged-in student
- Admin complaint management
- Update complaint status
- Add and view comments on complaints
- Filter complaints by status, priority, and category
- Pagination and sorting
- Centralized exception handling
- Input validation
- DTO-based API responses to prevent sensitive data exposure

## Tech Stack

- Java
- Spring Boot
- Spring Security
- JWT
- MySQL
- Spring Data JPA
- Hibernate
- Maven
- Postman
- IntelliJ IDEA

## Project Architecture

CampusConnect follows a layered architecture:

Controller
↓
Service
↓
Repository
↓
MySQL Database

### Project Structure

```text
src/main/java/com/campusconnect
│
├── config
│   └── SecurityConfig
│
├── controller
│   ├── AuthController
│   ├── ComplaintController
│   ├── AdminComplaintController
│   └── CommentController
│
├── dto
│   ├── LoginRequest
│   ├── RegisterRequest
│   ├── ComplaintRequest
│   ├── CommentRequest
│   ├── StatusUpdateRequest
│   ├── UserResponse
│   └── ComplaintResponse
│
├── entity
│   ├── User
│   ├── Complaint
│   ├── Comment
│   ├── Role
│   ├── ComplaintCategory
│   ├── ComplaintPriority
│   └── ComplaintStatus
│
├── repository
│   ├── UserRepository
│   ├── ComplaintRepository
│   └── CommentRepository
│
├── security
│   ├── JwtService
│   ├── JwtAuthenticationFilter
│   └── CustomUserDetailsService
│
├── service
│   ├── AuthService
│   ├── ComplaintService
│   └── CommentService
│
└── exception
    ├── BadRequestException
    ├── ResourceNotFoundException
    ├── ErrorResponse
    └── GlobalExceptionHandler

 # Authentication & Authorization

CampusConnect uses JWT-based authentication with Spring Security.

# Authentication Flow

User Registration
       ↓
Password BCrypt Hashing
       ↓
User Login
       ↓
Authentication
       ↓
JWT Token Generated
       ↓
Client Sends JWT
       ↓
JWT Authentication Filter
       ↓
Authenticated User
       ↓
Protected API

The application supports two roles:

STUDENT
ADMIN

Administrative APIs are protected using role-based authorization.

# Complaint Management

Students can create complaints containing:

-Title
-Description
-Category
-Priority

Each complaint also maintains:

Status
Creation timestamp
Update timestamp
Student/User reference

Administrators can:

- View all complaints
- Filter complaints
- Sort complaints
- Update complaint status
- Manage complaints based on priority and category

# Comments

Students can add comments to complaints and retrieve existing comments.

Each comment contains:

Message
User reference
Complaint reference
Creation timestamp

DTO-based responses are used to prevent unnecessary nested entity data from being exposed through the API.

# Filtering, Pagination & Sorting

Administrative complaint retrieval supports filtering, pagination, and sorting.

Filter by status
GET /api/admin/complaints?status=OPEN

Filter by priority
GET /api/admin/complaints?priority=HIGH

Filter by category
GET /api/admin/complaints?category=HOSTEL

Pagination
GET /api/admin/complaints?page=0&size=5

Sorting
GET /api/admin/complaints?sort=createdAt,desc

These parameters can also be combined:

GET /api/admin/complaints?status=OPEN&page=0&size=5&sort=createdAt,desc
API Endpoints
Authentication
Method	Endpoint	Description
POST	/api/auth/register	Register a new user
POST	/api/auth/login	Authenticate user and receive JWT
Student
Method	Endpoint	Description
POST	/api/complaints	Create a complaint
GET	/api/complaints/my	View own complaints
POST	/api/complaints/{complaintId}/comments	Add a comment
GET	/api/complaints/{complaintId}/comments	View complaint comments
Admin
Method	Endpoint	Description
GET	/api/admin/complaints	View all complaints
PUT	/api/admin/complaints/{id}/status	Update complaint status

# Error Handling

The application uses centralized exception handling with @RestControllerAdvice.

Handled cases include:

Resource not found
Invalid request data
Duplicate email registration
Validation errors

Example error response:

{
  "status": 404,
  "message": "Complaint not found",
  "timestamp": "2026-08-11T15:00:00"
}
# Database

CampusConnect uses MySQL with Spring Data JPA and Hibernate.

Main entities:

User
 │
 └── Complaint
       │
       └── Comment

JPA/Hibernate is used for object-relational mapping and database operations.

## Setup & Installation

### 1. Clone the Repository
### 2. Configure MySQL
### 3. Run the Application


The application reads sensitive configuration through environment variables instead of storing credentials directly in the source code.

3. Run the application

On Windows:

mvnw.cmd spring-boot:run

On Linux/macOS:

./mvnw spring-boot:run

The application runs on:

http://localhost:8080
API Testing

The APIs can be tested using Postman.

Recommended testing flow:

Register
   ↓
Login
   ↓
Copy JWT Token
   ↓
Authorize Protected APIs
   ↓
Create Complaint
   ↓
View Complaints
   ↓
Add Comment
   ↓
Admin Login
   ↓
Manage Complaints
Security

Sensitive configuration values such as:

MySQL password
JWT secret

are supplied through environment variables and are not hardcoded into the repository.

Passwords are stored using BCrypt hashing.

# Future Improvements
Email notifications for complaint status updates
Search by complaint title or description
Complaint analytics dashboard
File and image attachments
Frontend interface
Cloud deployment

# Author

Jagan Kanha Dalei