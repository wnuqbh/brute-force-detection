"""Model evaluation utilities."""

import pandas as pd
import numpy as np
from typing import Dict, Any, Tuple
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
    roc_auc_score,
    roc_curve,
    auc
)


class ModelEvaluator:
    """Handles model evaluation and reporting."""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize evaluator.
        
        Args:
            config: Configuration dictionary
        """
        self.config = config
        self.results = {}
    
    def evaluate(
        self,
        y_true: pd.Series,
        y_pred: np.ndarray,
        y_pred_proba: np.ndarray = None
    ) -> Dict[str, Any]:
        """
        Evaluate model predictions comprehensively.
        
        Args:
            y_true: True labels
            y_pred: Predicted labels
            y_pred_proba: Prediction probabilities (optional)
        
        Returns:
            Dictionary of evaluation metrics
        """
        results = {}
        
        # Classification metrics
        results["accuracy"] = accuracy_score(y_true, y_pred)
        results["precision"] = precision_score(y_true, y_pred, average="weighted")
        results["recall"] = recall_score(y_true, y_pred, average="weighted")
        results["f1"] = f1_score(y_true, y_pred, average="weighted")
        
        # Confusion matrix
        cm = confusion_matrix(y_true, y_pred)
        results["confusion_matrix"] = cm
        results["tn"] = cm[0, 0]
        results["fp"] = cm[0, 1]
        results["fn"] = cm[1, 0]
        results["tp"] = cm[1, 1]
        
        # ROC AUC if probabilities available
        if y_pred_proba is not None:
            if y_pred_proba.ndim > 1:
                # Multi-class: use probability of positive class
                proba = y_pred_proba[:, 1] if y_pred_proba.shape[1] > 1 else y_pred_proba[:, 0]
            else:
                proba = y_pred_proba
            
            try:
                results["roc_auc"] = roc_auc_score(y_true, proba)
            except Exception as e:
                print(f"Could not calculate ROC AUC: {e}")
        
        self.results = results
        return results
    
    def print_classification_report(
        self,
        y_true: pd.Series,
        y_pred: np.ndarray,
        target_names: list = None
    ) -> None:
        """
        Print detailed classification report.
        
        Args:
            y_true: True labels
            y_pred: Predicted labels
            target_names: Names of target classes
        """
        report = classification_report(y_true, y_pred, target_names=target_names)
        print("\n" + "="*60)
        print("CLASSIFICATION REPORT")
        print("="*60)
        print(report)
    
    def print_confusion_matrix(self, cm: np.ndarray = None) -> None:
        """
        Print confusion matrix.
        
        Args:
            cm: Confusion matrix array
        """
        if cm is None:
            cm = self.results.get("confusion_matrix")
        
        if cm is None:
            print("No confusion matrix available")
            return
        
        print("\n" + "="*60)
        print("CONFUSION MATRIX")
        print("="*60)
        print(cm)
        
        if cm.shape == (2, 2):
            tn, fp, fn, tp = cm.ravel()
            print(f"\nTrue Negatives:  {tn}")
            print(f"False Positives: {fp}")
            print(f"False Negatives: {fn}")
            print(f"True Positives:  {tp}")
    
    def get_metrics_summary(self) -> pd.DataFrame:
        """
        Get summary of all metrics as dataframe.
        
        Returns:
            DataFrame with metrics
        """
        metrics = {
            "accuracy": self.results.get("accuracy"),
            "precision": self.results.get("precision"),
            "recall": self.results.get("recall"),
            "f1": self.results.get("f1"),
            "roc_auc": self.results.get("roc_auc"),
        }
        
        return pd.DataFrame(metrics, index=[0]).T.rename(columns={0: "value"})
    
    def print_summary(self) -> None:
        """Print summary of evaluation results."""
        print("\n" + "="*60)
        print("EVALUATION SUMMARY")
        print("="*60)
        
        summary = self.get_metrics_summary()
        print(summary.to_string())
        
        # Print confusion matrix stats if available
        if "tp" in self.results:
            print(f"\nSensitivity (Recall):  {self.results['tp'] / (self.results['tp'] + self.results['fn']):.4f}")
            print(f"Specificity:           {self.results['tn'] / (self.results['tn'] + self.results['fp']):.4f}")
            print(f"Precision (PPV):       {self.results['tp'] / (self.results['tp'] + self.results['fp']):.4f}")
