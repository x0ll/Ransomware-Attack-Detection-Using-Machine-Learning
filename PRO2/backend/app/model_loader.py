from sklearn.ensemble import RandomForestClassifier
import joblib

def load_model(model_path):
    """
    Load the trained Random Forest model from the specified file path.
    
    Parameters:
    model_path (str): The file path to the serialized model.
    
    Returns:
    RandomForestClassifier: The loaded Random Forest model.
    """
    model = joblib.load(model_path)
    return model

# Example usage
if __name__ == "__main__":
    model = load_model('../models/random_forest_model.pkl')
    print("Model loaded successfully.")