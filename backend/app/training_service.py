import os, io, joblib, json
import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

DATASETS_PATH = os.path.join(os.path.dirname(__file__), '..', 'datasets')
MODELS_PATH   = os.path.join(os.path.dirname(__file__), '..', 'models')
LOG_PATH      = os.path.join(os.path.dirname(__file__), '..', 'training_log.json')

os.makedirs(DATASETS_PATH, exist_ok=True)
os.makedirs(MODELS_PATH, exist_ok=True)


def _detect_target(df):
    for col in ['Benign','label','Label','class','Class','target','Target','malware','is_malware','ransomware']:
        if col in df.columns:
            return col
    return None


def get_datasets():
    files = []
    if os.path.exists(DATASETS_PATH):
        for f in os.listdir(DATASETS_PATH):
            if f.endswith('.csv'):
                path = os.path.join(DATASETS_PATH, f)
                stat = os.stat(path)
                try:
                    df = pd.read_csv(path, nrows=1)
                    cols = len(df.columns)
                except:
                    cols = 0
                files.append({
                    "filename": f,
                    "size": stat.st_size,
                    "uploadTime": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
                    "columns": cols
                })
    return sorted(files, key=lambda x: x['uploadTime'], reverse=True)


def get_training_log():
    if os.path.exists(LOG_PATH):
        with open(LOG_PATH) as f:
            return json.load(f)
    return []


def upload_dataset(file_data: bytes, filename: str) -> dict:
    df = pd.read_csv(io.BytesIO(file_data))
    target_col = _detect_target(df)
    if target_col is None:
        raise ValueError("No target column found. Expected: 'Benign', 'label', 'class', or 'target'")

    df.drop_duplicates(inplace=True)
    df.fillna(0, inplace=True)

    save_path = os.path.join(DATASETS_PATH, filename)
    df.to_csv(save_path, index=False)

    counts = df[target_col].value_counts().to_dict()
    return {
        "filename": filename,
        "totalRows": len(df),
        "totalFeatures": len(df.columns) - 1,
        "targetColumn": target_col,
        "classDistribution": {str(k): int(v) for k, v in counts.items()},
        "uploadTime": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }


def train_model(filename: str, n_estimators: int = 320, model_name: str = None) -> dict:
    path = os.path.join(DATASETS_PATH, filename)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Dataset not found: {path}")

    print(f"Starting training with dataset: {filename}")
    df = pd.read_csv(path, sep=';')
    target_col = _detect_target(df)
    if not target_col:
        raise ValueError("No target column found in dataset")

    # Preprocessing
    print("Preprocessing data...")
    df.drop_duplicates(inplace=True)
    df.fillna(0, inplace=True)
    for col in df.select_dtypes(include=["object"]).columns:
        if col != target_col:
            le = LabelEncoder()
            df[col] = le.fit_transform(df[col].astype(str))

    X = df.drop(target_col, axis=1).astype(float)
    y = df[target_col].astype(float)

    print(f"Dataset loaded: {len(df)} rows, {len(X.columns)} features")
    print(f"Target column: {target_col}")

    # 5-Fold Cross Validation
    print("Starting 5-fold cross validation...")
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    model = RandomForestClassifier(n_estimators=n_estimators, random_state=42, n_jobs=-1)

    fold_metrics = []
    for fold, (train_idx, test_idx) in enumerate(skf.split(X, y), 1):
        print(f"Training fold {fold}/5...")
        X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
        y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        metrics = {
            "accuracy":  accuracy_score(y_test, y_pred),
            "precision": precision_score(y_test, y_pred, zero_division=0),
            "recall":    recall_score(y_test, y_pred, zero_division=0),
            "f1":        f1_score(y_test, y_pred, zero_division=0),
        }
        fold_metrics.append(metrics)
        print(f"Fold {fold} metrics: Accuracy={metrics['accuracy']:.4f}, Precision={metrics['precision']:.4f}, Recall={metrics['recall']:.4f}, F1={metrics['f1']:.4f}")

    # Train the final model on the full dataset
    print("Training final model on all data...")
    model.fit(X, y)

    avg = {k: round(float(np.mean([m[k] for m in fold_metrics])), 4) for k in fold_metrics[0]}

    print(f"Average metrics: Accuracy={avg['accuracy']:.4f}, Precision={avg['precision']:.4f}, Recall={avg['recall']:.4f}, F1={avg['f1']:.4f}")

    # Save the model to disk
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    save_name = model_name or f"model_{ts}.pkl"
    if not save_name.endswith('.pkl'):
        save_name += '.pkl'
    model_path = os.path.join(MODELS_PATH, save_name)
    joblib.dump(model, model_path)
    print(f"Model saved as: {save_name}")

    # Update the active model pointer file
    active_path = os.path.join(MODELS_PATH, 'active_model.txt')
    with open(active_path, 'w') as f:
        f.write(save_name)

    # Append this training run to the log
    log_entry = {
        "modelName": save_name,
        "dataset": filename,
        "trainedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "totalRows": len(df),
        "features": list(X.columns),
        "nEstimators": n_estimators,
        "metrics": avg,
        "folds": 5
    }
    log = get_training_log()
    log.insert(0, log_entry)
    with open(LOG_PATH, 'w') as f:
        json.dump(log[:20], f, indent=2)

    print("Training completed successfully!")
    return log_entry


def get_active_model_name():
    active_path = os.path.join(MODELS_PATH, 'active_model.txt')
    if os.path.exists(active_path):
        with open(active_path) as f:
            return f.read().strip()
    return "random_forest_model.pkl"


def get_saved_models():
    models = []
    active = get_active_model_name()
    log = {e['modelName']: e for e in get_training_log()}
    if os.path.exists(MODELS_PATH):
        for f in os.listdir(MODELS_PATH):
            if f.endswith('.pkl'):
                path = os.path.join(MODELS_PATH, f)
                stat = os.stat(path)
                entry = log.get(f, {})
                models.append({
                    "name": f,
                    "isActive": f == active,
                    "size": stat.st_size,
                    "trainedAt": entry.get("trainedAt", datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")),
                    "metrics": entry.get("metrics", {}),
                    "dataset": entry.get("dataset", "original"),
                    "totalRows": entry.get("totalRows", 0)
                })
    return sorted(models, key=lambda x: x['trainedAt'], reverse=True)


def activate_model(model_name: str):
    path = os.path.join(MODELS_PATH, model_name)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Model not found: {model_name}")
    active_path = os.path.join(MODELS_PATH, 'active_model.txt')
    with open(active_path, 'w') as f:
        f.write(model_name)
    return True
