import logging
import os
from logging.handlers import RotatingFileHandler

# Define log directory and file path
LOG_DIR = os.getenv("LOG_DIR", "logs")
LOG_FILE = os.path.join(LOG_DIR, "ml_service.log")

# Create logs directory if it doesn't exist
os.makedirs(LOG_DIR, exist_ok=True)

def get_logger(name: str = "SolarMLEngine") -> logging.Logger:
    """
    Configures and returns a custom logger instance with both console and file handlers.
    """
    logger = logging.getLogger(name)
    
    # Avoid attaching duplicate handlers if get_logger is called multiple times
    if logger.hasHandlers():
        return logger

    logger.setLevel(logging.INFO)

    # Clean, readable format including timestamp, level, module name, and message
    formatter = logging.Formatter(
        fmt="[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # 1. Console Handler (for real-time terminal monitoring via uvicorn)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # 2. Rotating File Handler (max 5 MB per file, keeps 3 backup files)
    try:
        file_handler = RotatingFileHandler(
            LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=3, encoding="utf-8"
        )
        file_handler.setLevel(logging.INFO)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    except Exception as e:
        # Fallback if file permissions prevent disk logging
        console_handler.setLevel(logging.DEBUG)
        logger.warning(f"Could not initialize file logging: {e}")

    # Reduce log noise from built-in server and HTTP libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)

    return logger

# Create a default shared instance for easy importing
logger = get_logger()