"""Utility functions for the ML pipeline."""

import logging
from pathlib import Path
from datetime import datetime


def setup_logging(log_dir: str = "logs", name: str = "pipeline") -> logging.Logger:
    """
    Setup logging configuration.
    
    Args:
        log_dir: Directory to save logs
        name: Logger name
    
    Returns:
        Configured logger object
    """
    Path(log_dir).mkdir(exist_ok=True)
    
    # Create logger
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)
    
    # Create file handler
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = Path(log_dir) / f"{name}_{timestamp}.log"
    file_handler = logging.FileHandler(log_file)
    file_handler.setLevel(logging.DEBUG)
    
    # Create console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    
    # Create formatter
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)
    
    # Add handlers to logger
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger


def print_section(title: str, width: int = 60) -> None:
    """
    Print a formatted section header.
    
    Args:
        title: Section title
        width: Line width
    """
    print("\n" + "="*width)
    print(title.center(width))
    print("="*width + "\n")


def print_metrics_table(metrics: dict) -> None:
    """
    Print metrics in table format.
    
    Args:
        metrics: Dictionary of metric names and values
    """
    print("\nMetrics Summary:")
    print("-" * 40)
    for metric, value in metrics.items():
        if isinstance(value, float):
            print(f"{metric:.<30} {value:.4f}")
        else:
            print(f"{metric:.<30} {value}")
