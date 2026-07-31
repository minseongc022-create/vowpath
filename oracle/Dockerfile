# syntax=docker/dockerfile:1
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    ORACLE_CONFIG_PATH=/app/config/settings.yaml \
    ORACLE_PORTFOLIO_PATH=/app/config/portfolio.yaml \
    ORACLE_DATA_DIR=/app/data

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY pyproject.toml README.md ARCHITECTURE.md ./
COPY config ./config
COPY src ./src
RUN pip install -e .

RUN cp -n config/portfolio.example.yaml config/portfolio.yaml 2>/dev/null || true \
    && mkdir -p /app/data/reports /app/data/logs /app/data/cache

VOLUME ["/app/data", "/app/config"]

EXPOSE 8080
ENTRYPOINT ["oracle"]
CMD ["run", "--report"]
