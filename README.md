# hn-trends 

**[hn-trends](https://hn-trends.vercel.app)** is a web application that visualizes submission and hiring trends on Hacker News. It provides insights into the frequency of various technologies mentioned in submission titles and the comments of _Ask HN: Who Is Hiring?_ posts.

**Technology stack**: PostgreSQL, DuckDB, React,  Docker

## Setup

### Prerequisites

- Docker Compose: [Installation Guide](https://docs.docker.com/compose/install/)

### Local Setup

1. **Environment Setup**:

Create a `.env` file in the project root with the following variables:

- `POSTGRES_USER`: name of the user to connect to PostgreSQL database
- `POSTGRES_PASSWORD`: password for user
- `COMPOSE_PROJECT_NAME=hndata`

An example file,

```bash
# update with the desired values
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
COMPOSE_PROJECT_NAME=hndata
```

2. **Build and run containers:**

Use Docker Compose to build and launch the application services:

```bash
docker-compose -f docker-compose.local.yml up --build
```

Once the containers are up and running, the application will be accessible at `http://localhost:80`.

3. **Data Loading:**

Use the [`load-data.sh`](./hndata-clj/load-data.sh) script to load the Hacker News submissions into the database. The script fetches data from the [Hacker News Algolia API](https://hn.algolia.com/api) and populates the PostgreSQL database.

```bash
cd hndata-clj
./load-data.sh
```

After data loading, run [`refresh.sh`](./db/refresh/refresh.sh) to extract the keywords from the submissions. The script builds and runs a Docker container which executes a Python that uses DuckDB to extract the keywords from the submissions.

```bash
cd db/refresh
./refresh.sh
```

## How is it deployed?

The database and API backend are deployed using a [Hetzner](https://www.hetzner.com) VPS (see [docker-compose.prod.yml](./docker-compose.prod.yml)). The data loading and refresh scripts are scheduled using cron.

The React frontend is hosted using [Vercel](https://vercel.com)