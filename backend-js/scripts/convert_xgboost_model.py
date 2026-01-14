#!/usr/bin/env python3
"""
XGBoost Model Converter Script

This script converts an XGBoost model from .pkl format to JSON format
for use with the JavaScript backend (xgboost-scorer package).

Usage:
    python convert_xgboost_model.py [input_pkl_path] [output_json_path]

If no arguments provided, creates a sample model for testing.

Requirements:
    pip install xgboost scikit-learn numpy
"""

import json
import sys
import os
import pickle
import numpy as np

try:
    import xgboost as xgb
    from sklearn.model_selection import train_test_split
except ImportError:
    print("Error: Required packages not installed.")
    print("Run: pip install xgboost scikit-learn numpy")
    sys.exit(1)


def create_sample_model():
    """
    Create a sample XGBoost model for predicting next review days.
    
    Features:
    - latest_score: Last quiz score (0-10)
    - avg_score: Average score across attempts (0-10)
    - attempts_count: Number of quiz attempts
    - days_since_last_attempt: Days since last attempt
    
    Target:
    - days_until_next_review: Predicted days until next review (1-30)
    """
    print("Creating sample XGBoost model for review prediction...")
    
    # Generate synthetic training data
    np.random.seed(42)
    n_samples = 1000
    
    # Features
    latest_score = np.random.uniform(0, 10, n_samples)
    avg_score = np.random.uniform(0, 10, n_samples)
    attempts_count = np.random.randint(1, 20, n_samples)
    days_since_last = np.random.randint(0, 60, n_samples)
    
    X = np.column_stack([latest_score, avg_score, attempts_count, days_since_last])
    
    # Target: days until next review (spaced repetition logic)
    # Higher scores = longer intervals, more attempts = longer intervals
    base_interval = 1 + (latest_score * 2) + (avg_score * 1.5) + (attempts_count * 0.5)
    noise = np.random.normal(0, 2, n_samples)
    y = np.clip(base_interval + noise, 1, 30).astype(int)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Create and train model
    model = xgb.XGBRegressor(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        objective='reg:squarederror',
        random_state=42
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate
    train_score = model.score(X_train, y_train)
    test_score = model.score(X_test, y_test)
    print(f"Training R² score: {train_score:.4f}")
    print(f"Test R² score: {test_score:.4f}")
    
    return model


def convert_model_to_json(model, output_path):
    """
    Convert XGBoost model to JSON format compatible with xgboost-scorer.
    """
    print(f"Converting model to JSON format...")
    
    # Get the booster from the model
    booster = model.get_booster()
    
    # Save as JSON (explicitly use .json extension for JSON format)
    temp_json_path = output_path + '.temp.json'
    booster.save_model(temp_json_path)
    
    # Read and format the JSON
    with open(temp_json_path, 'r', encoding='utf-8') as f:
        model_json = json.load(f)
    
    # Clean up temp file
    os.remove(temp_json_path)
    
    # Write formatted JSON
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(model_json, f, indent=2)
    
    print(f"Model saved to: {output_path}")
    return model_json


def load_pkl_model(pkl_path):
    """Load an XGBoost model from a pickle file."""
    print(f"Loading model from: {pkl_path}")
    
    with open(pkl_path, 'rb') as f:
        model = pickle.load(f)
    
    # Handle different model types
    if hasattr(model, 'get_booster'):
        return model
    elif isinstance(model, xgb.Booster):
        # Wrap booster in XGBRegressor for consistency
        wrapper = xgb.XGBRegressor()
        wrapper._Booster = model
        return wrapper
    else:
        raise ValueError(f"Unknown model type: {type(model)}")


def main():
    # Default output path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    default_output = os.path.join(script_dir, '..', 'model.json')
    
    if len(sys.argv) >= 2:
        # Convert existing .pkl model
        pkl_path = sys.argv[1]
        output_path = sys.argv[2] if len(sys.argv) >= 3 else default_output
        
        if not os.path.exists(pkl_path):
            print(f"Error: File not found: {pkl_path}")
            sys.exit(1)
        
        model = load_pkl_model(pkl_path)
    else:
        # Create sample model
        print("No input file provided. Creating sample model...")
        output_path = default_output
        model = create_sample_model()
    
    # Convert to JSON
    convert_model_to_json(model, output_path)
    
    # Verify the output
    file_size = os.path.getsize(output_path)
    print(f"Output file size: {file_size / 1024:.2f} KB")
    print("Conversion complete!")


if __name__ == '__main__':
    main()
