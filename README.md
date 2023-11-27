# hn-trends 

[hn-trends](https://hn-trends.vercel.app) visualises submission and hiring (via _Ask HN: Who Is Hiring?_ posts) trends. It allows users to analyze the occurrence frequency of various technologies in submission titles or hiring post descriptions.

**Technology stack**: PostgreSQL, React, Docker

## Setup

### Prerequisites

- Docker Compose: [Installation Guide](https://docs.docker.com/compose/install/)

### Local Setup

1. **Environment Setup**:

Create a `.env` file in the project root with the following variables:

- `POSTGRES_USER`: name of the user to connect to PostgreSQL database
- `POSTGRES_PASSWORD`: password for user

An example file,

```bash
# update with the desired values
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
```

2. **Build and run containers:**

Build and run the application using Docker Compose:

```bash
docker-compose -f docker-compose.local.yml up --build
```

3. **Data Loading:**

Use the [`load-data.sh`](./hndata-clj/load-data.sh) script to load the Hacker News submissions into the database:

```bash
cd hndata-clj
./load-data.sh
```

After completing the setup, the application will be available at `http://localhost:80`.


## How is it deployed?

The database and API backend are deployed using a [Digital Ocean](https://www.digitalocean.com) droplet (see [docker-compose.prod.yml](./docker-compose.prod.yml)). The data loading script is scheduled using cron.

The React frontend is hosted using [Vercel](https://vercel.com)