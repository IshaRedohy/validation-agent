FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY backend /app/backend
RUN useradd -m pilot && mkdir -p /data/documents && chown -R pilot:pilot /data
USER pilot
CMD ["uvicorn", "backend.api:app", "--host", "0.0.0.0", "--port", "8000"]
