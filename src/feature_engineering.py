"""Feature engineering and selection utilities."""

import pandas as pd
import numpy as np
from typing import List, Dict, Tuple
from sklearn.preprocessing import StandardScaler, MinMaxScaler


class FeatureEngineer:
    """Handles feature engineering and selection."""
    
    def __init__(self, config: Dict):
        """
        Initialize feature engineer.
        
        Args:
            config: Configuration dictionary containing feature definitions
        """
        self.config = config
        self.feature_sets = config.get("core_features", [])
        self.scaler = None
        self.scaling_fitted = False
    
    def select_features(
        self, X: pd.DataFrame, feature_set: str = "core"
    ) -> pd.DataFrame:
        """
        Select features based on predefined feature sets.

        Engineered features (e.g. failed_login_ratio, risk_score) are added
        in train.py AFTER the train/test split, so they will not exist in X
        at this stage. They are silently skipped here and kept post-split.
        
        Args:
            X: Input features dataframe
            feature_set: Feature set to use ('core', 'extended', or 'all')
        
        Returns:
            Dataframe with selected features
        """
        if feature_set == "core":
            features = self.config.get("core_features", [])
        elif feature_set == "extended":
            features = self.config.get("extended_features", [])
        else:  # 'all'
            features = X.columns.tolist()
        
        # Only select features that exist at this stage.
        # Engineered features are not yet present — they are added post-split
        # in train.py and do not need to be selected here.
        available_features = [f for f in features if f in X.columns]
        engineered_pending = [f for f in features if f not in X.columns]

        if engineered_pending:
            print(f"Note: Engineered features will be added post-split: {engineered_pending}")
        
        X_selected = X[available_features].copy()
        print(f"Selected {len(available_features)} base features ({feature_set} set)")
        
        return X_selected
    
    def scale_features(
        self, X: pd.DataFrame, fit: bool = True, method: str = "standard"
    ) -> pd.DataFrame:
        """
        Scale/normalize features.
        
        Args:
            X: Input features dataframe
            fit: If True, fit scaler on data
            method: Scaling method ('standard' or 'minmax')
        
        Returns:
            Scaled features dataframe
        """
        if fit or self.scaler is None:
            if method == "standard":
                self.scaler = StandardScaler()
            elif method == "minmax":
                self.scaler = MinMaxScaler()
            else:
                raise ValueError(f"Unknown scaling method: {method}")
            
            X_scaled = self.scaler.fit_transform(X)
            self.scaling_fitted = True
        else:
            X_scaled = self.scaler.transform(X)
        
        X_scaled = pd.DataFrame(X_scaled, columns=X.columns, index=X.index)
        print(f"Features scaled using {method} scaler")
        
        return X_scaled
    
    def get_feature_statistics(self, X: pd.DataFrame) -> pd.DataFrame:
        """
        Get statistical summary of features.
        
        Args:
            X: Input features dataframe
        
        Returns:
            Statistics dataframe
        """
        return X.describe().T
    
    def get_feature_correlations(self, X: pd.DataFrame, y: pd.Series) -> pd.Series:
        """
        Calculate feature correlations with target variable.
        
        Args:
            X: Input features dataframe
            y: Target variable series
        
        Returns:
            Series of correlations with target
        """
        combined = pd.concat([X, y], axis=1)
        target_name = y.name or "target"
        
        correlations = combined.corr()[target_name].drop(target_name)
        correlations = correlations.abs().sort_values(ascending=False)
        
        return correlations
    
    def rank_features_by_importance(
        self, X: pd.DataFrame, y: pd.Series, method: str = "correlation"
    ) -> pd.Series:
        """
        Rank features by importance.
        
        Args:
            X: Input features dataframe
            y: Target variable series
            method: Method to use ('correlation' or 'variance')
        
        Returns:
            Ranked feature importance
        """
        if method == "correlation":
            importance = self.get_feature_correlations(X, y)
        elif method == "variance":
            importance = X.var().sort_values(ascending=False)
        else:
            raise ValueError(f"Unknown ranking method: {method}")
        
        return importance