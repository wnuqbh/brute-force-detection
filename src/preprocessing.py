"""Data preprocessing utilities for the ML pipeline."""

import pandas as pd
import numpy as np
from typing import Tuple, Optional, Dict, Any
from pathlib import Path


class DataPreprocessor:
    """Handles data loading and preprocessing."""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize the preprocessor with configuration.
        
        Args:
            config: Configuration dictionary
        """
        self.config = config
        self.missing_value_fillna: Dict[str, Any] = {}
        self.categorical_columns: list = []
        self.target_column = config.get("target_column", "attack_detected")
        self.drop_columns = config.get("drop_columns", [])
    
    def load_data(self, data_path: str) -> pd.DataFrame:
        """
        Load data from CSV file.
        
        Args:
            data_path: Path to the CSV file
        
        Returns:
            Loaded dataframe
        """
        if not Path(data_path).exists():
            raise FileNotFoundError(f"Data file not found: {data_path}")
        
        df = pd.read_csv(data_path)
        print(f"Loaded data with shape: {df.shape}")
        return df
    
    def handle_missing_values(
        self, df: pd.DataFrame, fit: bool = True
    ) -> pd.DataFrame:
        """
        Handle missing values in the dataframe.
        
        Args:
            df: Input dataframe
            fit: If True, learn filling strategy from data
        
        Returns:
            Dataframe with missing values handled
        """
        df = df.copy()
        
        if fit:
            # Learn missing value strategy
            for col in df.columns:
                if df[col].isnull().sum() > 0:
                    if df[col].dtype == "object":
                        self.missing_value_fillna[col] = "Unknown"
                    else:
                        self.missing_value_fillna[col] = df[col].median()
        
        # Apply filling strategy
        for col, fill_value in self.missing_value_fillna.items():
            if col in df.columns:
                df[col] = df[col].fillna(fill_value)
        
        print(f"Missing values handled. Remaining: {df.isnull().sum().sum()}")
        return df
    
    def encode_categorical_features(
        self, df: pd.DataFrame, fit: bool = True
    ) -> pd.DataFrame:
        """
        Encode categorical features.
        
        Args:
            df: Input dataframe
            fit: If True, learn encoding from data
        
        Returns:
            Dataframe with encoded features
        """
        df = df.copy()
        
        if fit:
            # Identify categorical columns
            self.categorical_columns = df.select_dtypes(
                include=["object"]
            ).columns.tolist()
        
        # One-hot encoding
        if self.categorical_columns:
            df = pd.get_dummies(df, columns=self.categorical_columns, drop_first=True)
            print(f"Encoded {len(self.categorical_columns)} categorical features")
        
        return df
    
    def preprocess(
        self, df: pd.DataFrame, fit: bool = True
    ) -> Tuple[pd.DataFrame, Optional[pd.Series]]:
        """
        Run full preprocessing pipeline.
        
        Args:
            df: Input dataframe
            fit: If True, learn preprocessing strategy
        
        Returns:
            Tuple of (X, y) dataframes. y is None if target column not present
        """
        df = df.copy()
        
        # Separate target variable if present
        if self.target_column in df.columns:
            y = df[self.target_column].copy()
            df = df.drop(columns=[self.target_column])
        else:
            y = None
        
        # Drop unnecessary columns
        df = df.drop(columns=[col for col in self.drop_columns if col in df.columns])
        
        # Handle missing values
        df = self.handle_missing_values(df, fit=fit)
        
        # Encode categorical features
        df = self.encode_categorical_features(df, fit=fit)
        
        print(f"Preprocessing complete. Final shape: {df.shape}")
        
        return df, y
