import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score


# same metrics the notebook uses for consistency
def calculate_metrics(y_true, y_pred) -> dict:
    return {
        "accuracy":  round(float(accuracy_score(y_true, y_pred)), 4),
        "precision": round(float(precision_score(y_true, y_pred, zero_division=0)), 4),
        "recall":    round(float(recall_score(y_true, y_pred, zero_division=0)), 4),
        "f1":        round(float(f1_score(y_true, y_pred, zero_division=0)), 4),
    }


# hard-coded CV results from the original notebook run (Random Forest n=320, max_depth=4)
def get_cross_validation_metrics() -> dict:
    return {
        "accuracy":  0.9893,
        "precision": 0.9895,
        "recall":    0.9891,
        "f1":        0.9893,
    }