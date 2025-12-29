"""
Validation utilities for the RTLS system.
"""
import re
from typing import Dict

# Pincode validation patterns for different countries
PINCODE_PATTERNS: Dict[str, Dict[str, str]] = {
    "India": {
        "pattern": r"^\d{6}$",
        "description": "6 digits (e.g., 110001)"
    },
    "United States": {
        "pattern": r"^\d{5}(-\d{4})?$",
        "description": "5 digits or 5+4 format (e.g., 12345 or 12345-6789)"
    },
    "United Kingdom": {
        "pattern": r"^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$",
        "description": "UK postcode format (e.g., SW1A 1AA)"
    },
    "Canada": {
        "pattern": r"^[A-Z]\d[A-Z]\s?\d[A-Z]\d$",
        "description": "Canadian postal code (e.g., K1A 0B1)"
    },
    "Australia": {
        "pattern": r"^\d{4}$",
        "description": "4 digits (e.g., 2000)"
    },
    "Germany": {
        "pattern": r"^\d{5}$",
        "description": "5 digits (e.g., 10115)"
    },
    "France": {
        "pattern": r"^\d{5}$",
        "description": "5 digits (e.g., 75001)"
    },
    "Japan": {
        "pattern": r"^\d{3}-?\d{4}$",
        "description": "7 digits with optional hyphen (e.g., 100-0001)"
    },
    "China": {
        "pattern": r"^\d{6}$",
        "description": "6 digits (e.g., 100000)"
    },
    "Brazil": {
        "pattern": r"^\d{5}-?\d{3}$",
        "description": "8 digits with optional hyphen (e.g., 01310-100)"
    },
    "Singapore": {
        "pattern": r"^\d{6}$",
        "description": "6 digits (e.g., 018956)"
    },
    "Netherlands": {
        "pattern": r"^\d{4}\s?[A-Z]{2}$",
        "description": "4 digits and 2 letters (e.g., 1012 AB)"
    },
}


def validate_pincode(pincode: str, country: str) -> bool:
    """
    Validate pincode/postal code based on country.

    Args:
        pincode: The pincode/postal code to validate
        country: The country name

    Returns:
        True if valid, False otherwise
    """
    if not pincode or not country:
        return False

    # Get the pattern for the country, or use a generic pattern
    country_info = PINCODE_PATTERNS.get(country)

    if country_info:
        pattern = country_info["pattern"]
        return bool(re.match(pattern, pincode.strip(), re.IGNORECASE))

    # For countries not in the list, accept any alphanumeric postal code (3-10 characters)
    generic_pattern = r"^[A-Z0-9\s-]{3,10}$"
    return bool(re.match(generic_pattern, pincode.strip(), re.IGNORECASE))


def get_pincode_format_hint(country: str) -> str:
    """
    Get the expected pincode format for a country.

    Args:
        country: The country name

    Returns:
        A description of the expected format
    """
    country_info = PINCODE_PATTERNS.get(country)
    if country_info:
        return country_info["description"]
    return "Alphanumeric postal code (3-10 characters)"


def get_supported_countries() -> list:
    """
    Get list of countries with specific pincode validation.

    Returns:
        List of country names
    """
    return list(PINCODE_PATTERNS.keys())
