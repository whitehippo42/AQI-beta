#!/bin/bash
echo "Starting AQI Prediction System initialization..."
python aqi_prediction_system.py
echo "Starting Flask backend server..."
gunicorn --bind=0.0.0.0 --timeout 600 flask_api_backend:app
