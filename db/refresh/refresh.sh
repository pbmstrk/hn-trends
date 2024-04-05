#!/bin/bash

echo "Loading environment variables"
set -a
source ../../.env
set +a

# Build Docker Image
echo "Building Docker image..."
docker build --platform linux/x86_64 -t data-refresh .

# Check if Docker build was successful
if [ $? -ne 0 ]; then
    echo "Docker build failed, exiting."
    exit 1
fi
echo "Docker image built successfully."

docker run --platform linux/x86_64 --network=hndata_default --rm -e POSTGRES_USER="$POSTGRES_USER" -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" data-refresh