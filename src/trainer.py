"""Model training utilities."""

import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from typing import Dict, Tuple, Any, Optional
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier


class ModelTrainer:
    """Handles model training and management."""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize model trainer.
        
        Args:
            config: Configuration dictionary
        """
        self.config = config
        self.model = None
        self.is_fitted = False
    
    def build_model(self, model_type: str = "RandomForest", **kwargs) -> Any:
        """
        Build a model based on configuration.
        
        Args:
            model_type: Type of model to build
            **kwargs: Additional parameters to override config
        
        Returns:
            Initialized model object
        """
        if model_type == "RandomForest":
            model_params = self.config.get("params", {})
            model_params.update(kwargs)
            self.model = RandomForestClassifier(**model_params)
        else:
            raise ValueError(f"Unknown model type: {model_type}")
        
        print(f"Built {model_type} model with params: {model_params}")
        return self.model
    
    def split_data(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        test_size: float = 0.2,
        random_state: int = 42,
        stratify: bool = True
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
        """
        Split data into train and test sets.
        
        Args:
            X: Features dataframe
            y: Target series
            test_size: Proportion of data for testing
            random_state: Random seed
            stratify: Whether to stratify by target
        
        Returns:
            Tuple of (X_train, X_test, y_train, y_test)
        """
        stratify_col = y if stratify else None
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y,
            test_size=test_size,
            random_state=random_state,
            stratify=stratify_col
        )
        
        print(f"Data split: Train={X_train.shape[0]}, Test={X_test.shape[0]}")
        return X_train, X_test, y_train, y_test
    
    def train(
        self,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        **kwargs
    ) -> Any:
        """
        Train the model.
        
        Args:
            X_train: Training features
            y_train: Training target
            **kwargs: Additional parameters for model
        
        Returns:
            Trained model
        """
        if self.model is None:
            self.build_model(**kwargs)
        
        self.model.fit(X_train, y_train)
        self.is_fitted = True
        
        print(f"Model trained on {X_train.shape[0]} samples")
        return self.model
    
    def predict(self, X: pd.DataFrame, return_proba: bool = False) -> np.ndarray:
        """
        Make predictions.
        
        Args:
            X: Features for prediction
            return_proba: If True, return prediction probabilities
        
        Returns:
            Predictions or prediction probabilities
        """
        if not self.is_fitted:
            raise ValueError("Model must be trained before making predictions")
        
        if return_proba:
            return self.model.predict_proba(X)
        else:
            return self.model.predict(X)
    
    def save_model(self, save_path: str) -> None:
        """
        Save trained model to disk.
        
        Args:
            save_path: Path to save the model
        """
        if not self.is_fitted:
            raise ValueError("Cannot save unfitted model")
        
        Path(save_path).parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.model, save_path)
        print(f"Model saved to {save_path}")
    
    def load_model(self, load_path: str) -> Any:
        """
        Load a trained model from disk.
        
        Args:
            load_path: Path to the model file
        
        Returns:
            Loaded model
        """
        if not Path(load_path).exists():
            raise FileNotFoundError(f"Model file not found: {load_path}")
        
        self.model = joblib.load(load_path)
        self.is_fitted = True
        print(f"Model loaded from {load_path}")
        return self.model
    
    def get_feature_importance(self) -> pd.Series:
        """
        Get feature importance scores.
        
        Returns:
            Series of feature importances
        """
        if not self.is_fitted:
            raise ValueError("Model must be trained first")
        
        if not hasattr(self.model, 'feature_importances_'):
            raise ValueError("Model does not support feature importance")
        
        # This requires X to have been fit with, so we can't get column names here
        # Return as numpy array instead
        return self.model.feature_importances_
