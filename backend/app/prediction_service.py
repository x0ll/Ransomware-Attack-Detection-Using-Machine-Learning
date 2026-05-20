import os
import joblib
import numpy as np
import pandas as pd
from app.preprocessing import preprocess_dataframe


class PredictionService:
    def __init__(self, model_path: str):
        self.model = self._load_model(model_path)

    def _load_model(self, model_path: str):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found at: {model_path}")
        return joblib.load(model_path)

    def make_prediction(self, df: pd.DataFrame) -> np.ndarray:
        """
        Applies preprocessing then runs the model.
        Returns: array of predictions (1=Benign, 0=Ransomware)
        """
        # Run the same preprocessing steps used during training
        X, y, feature_names = preprocess_dataframe(df)

        # Align columns to match what the model expects
        expected = getattr(self.model, 'n_features_in_', None)
        if expected and len(X.columns) != expected:
            model_features = getattr(self.model, 'feature_names_in_', None)
            if model_features is not None:
                # Add any missing columns with a default value of 0
                for col in model_features:
                    if col not in X.columns:
                        X[col] = 0.0
                X = X[model_features]
            else:
                # Trim or pad columns to match expected count
                if len(X.columns) > expected:
                    X = X.iloc[:, :expected]
                else:
                    for i in range(expected - len(X.columns)):
                        X[f'_pad_{i}'] = 0.0

        predictions = self.model.predict(X)
        return predictions
