import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder


def preprocess_dataframe(df: pd.DataFrame):
    """
    Applies the same preprocessing steps used during training.
    Returns: (X, y_or_None, feature_names)
    """
    df = df.copy()

    # 1. Drop duplicate rows
    df.drop_duplicates(inplace=True)

    # 2. Fill missing values with 0
    df.fillna(0, inplace=True)

    # 3. Encode any categorical (text) columns to numeric
    categorical_cols = df.select_dtypes(include=["object"]).columns
    for col in categorical_cols:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col].astype(str))

    # 4. Separate features and target label
    if "Benign" in df.columns:
        X = df.drop("Benign", axis=1).astype(float)
        y = df["Benign"].astype(float)
        return X, y, list(X.columns)
    else:
        X = df.astype(float)
        return X, None, list(X.columns)
