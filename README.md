# Claim Service

A Node.js/Express service for building and submitting FHIR claim bundles to a remote API.

## Features

- Accepts claim form data via REST API
- Transforms data into FHIR-compliant bundles
- Submits bundles to a remote FHIR API
- Logging with Winston
- Environment-based configuration

## Project Structure

```
.
├── controllers/           # Express route controllers
├── logs/                  # Log files
├── routes/                # Express route definitions
├── service/               # Business logic and FHIR bundle builder
├── utils/                 # Utility modules (constants, logger)
├── .env                   # Environment variables
├── .gitignore
├── package.json
├── README.md
├── server.js              # Express server entry point
```

## Getting Started

### Prerequisites

- Node.js (v14+ recommended)
- npm

### Installation

```sh
npm install
```

### Configuration

Copy `.env` and update values as needed:

```
PORT=5000
API_BASE_URL=https://qa-payers.apeiro-digital.com/api/v1/
API_KEY=your-api-key
```

### Running the Server

```sh
npm run dev
```
or
```sh
npm start
```

### API Endpoints

- `POST /api/claims/submit`  
  Submit a claim bundle.  
  **Body:**  
  ```json
  {
    "formData": { /* claim form data */ }
  }
  ```

- `GET /health`  
  Health check endpoint.

## Logging

Logs are written to the `logs/` directory and to the console.

##