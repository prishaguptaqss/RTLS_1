#!/usr/bin/env python3
"""
VAPID Key Generator for Web Push Notifications.

Run this script to generate VAPID keys for your application.
Add the generated keys to your .env file.

Usage:
    python generate_vapid_keys.py
"""
from py_vapid import Vapid

def generate_vapid_keys():
    """Generate VAPID key pair for Web Push notifications."""
    print("Generating VAPID keys for Web Push Notifications...")
    print("=" * 60)

    # Generate VAPID keys
    vapid = Vapid()
    vapid.generate_keys()

    private_key = vapid.private_pem().decode('utf-8').strip()
    public_key = vapid.public_key.public_bytes_urlsafe_base64().decode('utf-8')

    print("\nVAPID Keys Generated Successfully!")
    print("=" * 60)
    print("\nAdd these to your .env file:\n")
    print(f"VAPID_PRIVATE_KEY={private_key}")
    print(f"VAPID_PUBLIC_KEY={public_key}")
    print("\n" + "=" * 60)
    print("\nIMPORTANT:")
    print("1. Keep the VAPID_PRIVATE_KEY secret and secure")
    print("2. Never commit the private key to version control")
    print("3. The public key will be shared with browsers")
    print("4. Once set, don't change these keys or existing subscriptions will break")
    print("=" * 60)

if __name__ == "__main__":
    generate_vapid_keys()
